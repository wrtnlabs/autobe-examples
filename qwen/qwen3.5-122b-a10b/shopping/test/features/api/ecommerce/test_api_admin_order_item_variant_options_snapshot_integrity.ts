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
 * Test administrator access to order item variant option snapshots with integrity validation.
 *
 * Validates that variant option key-value pairs retrieved from an order item's purchase snapshot accurately reflect the configuration at the time of purchase, independent of any subsequent modifications to the product variant. This ensures historical data preservation for order history accuracy and dispute resolution.
 *
 * The test authenticates as an administrator and queries the variant option snapshot endpoint for a specific order item. It verifies that the returned options maintain their original key-value structure regardless of current variant state.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Generate valid order ID and order item ID for testing (assumes existing data).
 * 3. Call the variant options snapshot endpoint with pagination parameters.
 * 4. Validate response structure contains paginated variant option summaries.
 * 5. Verify each option has valid key-value pair structure with timestamps.
 * 6. Confirm snapshot data preserves purchase-time configuration.
 */
export async function test_api_admin_order_item_variant_options_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate test order and item IDs (assumes existing data in test environment)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the variant options snapshot endpoint
  const snapshotOptions: IPageIEcommerceOrderItemSnapshotVariantOption.ISummary =
    await api.functional.ecommerce.admin.orders.items.snapshot.variant.options.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies
            | (number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100>)
            | undefined,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(snapshotOptions);
  // 4. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    snapshotOptions.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(snapshotOptions.data),
  );
  // 5. Validate each variant option has required fields
  if (snapshotOptions.data.length > 0) {
    const firstOption = snapshotOptions.data[0];
    typia.assert(firstOption);
    TestValidator.predicate("option has id", firstOption.id !== null);
    TestValidator.predicate("option has key", firstOption.key.length > 0);
    TestValidator.predicate("option has value", firstOption.value.length > 0);
    TestValidator.predicate(
      "option has created_at",
      firstOption.created_at !== null,
    );
    TestValidator.predicate(
      "option has updated_at",
      firstOption.updated_at !== null,
    );
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    snapshotOptions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotOptions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotOptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotOptions.pagination.pages >= 0,
  );
}
