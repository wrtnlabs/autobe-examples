import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Admin successfully retrieves the immutable variant snapshot for an order item.
 *
 * Validates the administrator's ability to access historical variant data preserved at order placement time. This endpoint returns the exact state of a product variant including SKU code, pricing, and option values as they existed when the customer purchased the item, enabling accurate dispute resolution and order history verification.
 *
 * The test ensures the snapshot preserves all critical purchase-time data:
 * - SKU code identifying the specific variant configuration
 * - Variant price charged at the time of purchase
 * - Option key-value pairs (color, size, material, etc.) as selected by customer
 * - Creation timestamp synchronized with order placement
 *
 * 1. Administrator authenticates via admin join endpoint with randomized credentials.
 * 2. Admin connection retrieves variant snapshot for a test order item using random UUIDs.
 * 3. Validates response structure matches IEcommerceOrderItemSnapshotVariant schema.
 * 4. Confirms options array contains valid IEcommerceOrderItemSnapshotVariantOption entries with key-value pairs.
 * 5. Verifies all required fields (sku_code, variant_price, created_at) are present and properly typed.
 */
export async function test_api_order_item_variant_snapshot_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Retrieve variant snapshot for order item
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommerceOrderItemSnapshotVariant =
    await api.functional.ecommerce.admin.orders.items.snapshot.variant.at(
      adminConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot structure and content
  TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot has sku code",
    snapshot.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant price is positive",
    snapshot.variant_price > 0,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has options array",
    Array.isArray(snapshot.options),
  );
  // 4. Validate options array structure if present
  if (snapshot.options.length > 0) {
    const firstOption = snapshot.options[0];
    TestValidator.predicate("option has valid id", firstOption.id.length > 0);
    TestValidator.predicate("option has key", firstOption.key.length > 0);
    TestValidator.predicate("option has value", firstOption.value.length > 0);
    TestValidator.predicate(
      "option has created_at",
      firstOption.created_at.length > 0,
    );
  }
}
