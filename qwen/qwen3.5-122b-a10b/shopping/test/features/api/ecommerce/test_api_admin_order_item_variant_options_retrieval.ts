import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of variant option snapshots from order items.
 *
 * Validates that administrators can access historical product variant configuration data preserved in order item snapshots. This ensures audit trail integrity for product options selected at purchase time, independent of subsequent variant modifications.
 *
 * The test verifies snapshot data structure, pagination functionality, and optional key-based filtering capabilities for variant option attributes.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Call the snapshot variant options retrieval endpoint with order and item IDs.
 * 3. Verify response contains paginated variant options with all required fields.
 * 4. Validate pagination metadata structure.
 * 5. Test optional key filter parameter functionality.
 */
export async function test_api_admin_order_item_variant_options_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve variant options from order item snapshot
  // Note: Order and order item IDs are assumed to exist in test environment
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const optionsPage: IPageIEcommerceOrderItemSnapshotVariantOption.ISummary =
    await api.functional.ecommerce.admin.orders.items.snapshot.variant.options.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {} satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(optionsPage);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    optionsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    optionsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    optionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    optionsPage.pagination.pages >= 0,
  );
  // 4. Validate variant options structure (typia.assert already validates types)
  // Test business logic: if data exists, options should have valid key-value pairs
  if (optionsPage.data.length > 0) {
    for (const option of optionsPage.data) {
      typia.assert(option);
      TestValidator.predicate("option key is non-empty", option.key.length > 0);
      TestValidator.predicate(
        "option value is non-empty",
        option.value.length > 0,
      );
    }
  }
  // 5. Test optional key filter
  if (optionsPage.data.length > 0) {
    const filterKey = optionsPage.data[0].key;
    const filteredPage: IPageIEcommerceOrderItemSnapshotVariantOption.ISummary =
      await api.functional.ecommerce.admin.orders.items.snapshot.variant.options.index(
        adminConnection,
        {
          orderId,
          itemId,
          body: {
            key: filterKey,
          } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
        },
      );
    typia.assert(filteredPage);
    // All returned options should match the filter key
    for (const option of filteredPage.data) {
      TestValidator.equals(
        "filtered option key matches",
        option.key,
        filterKey,
      );
    }
  }
}
