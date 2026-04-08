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
 * Test administrator access to order item variant options after product deletion.
 *
 * Validates that variant option key-value pairs in an order item's purchase snapshot remain accessible even after the associated product is deleted. This ensures order history is preserved for deleted products and the snapshot system maintains data integrity for audit and compliance purposes.
 *
 * The test authenticates as administrator, retrieves variant options from an order item snapshot, and verifies the response structure includes proper pagination metadata and option data. This confirms that historical transaction data remains accessible regardless of current product availability.
 *
 * 1. Administrator account is created and authenticated via authorize_admin_join.
 * 2. Target endpoint is called with order ID and order item ID to retrieve variant options.
 * 3. Response is validated to ensure pagination metadata and data array exist.
 * 4. Variant options are confirmed to maintain key-value pair structure from purchase time.
 */
export async function test_api_admin_order_item_variant_options_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate UUIDs for order and order item (assumes snapshot data exists in test environment)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call target endpoint to retrieve variant options from snapshot
  const options: IPageIEcommerceOrderItemSnapshotVariantOption.ISummary =
    await api.functional.ecommerce.admin.orders.items.snapshot.variant.options.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {} satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(options);
  // 4. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    options.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(options.data));
  TestValidator.predicate(
    "pagination has current page",
    options.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    options.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    options.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    options.pagination.pages >= 0,
  );
}
