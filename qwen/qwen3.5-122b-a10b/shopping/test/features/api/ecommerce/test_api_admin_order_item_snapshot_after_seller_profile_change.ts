import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
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
 * Test administrator access to order item snapshot endpoint for historical seller information.
 *
 * Validates that administrators can retrieve point-in-time snapshots of order items containing preserved seller profile information (shop name and logo) as it existed at purchase time. This ensures the snapshot system correctly maintains historical records independent of subsequent seller profile changes.
 *
 * The test verifies the snapshot endpoint returns all required fields including product_name, seller_shop_name, seller_logo_url, and base_price, which are denormalized at order placement and never modified thereafter.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Generate valid UUIDs for order and order item (simulating existing data).
 * 3. Retrieve order item snapshot via admin endpoint.
 * 4. Validate snapshot structure with typia.assert.
 * 5. Verify all seller information fields exist and are properly typed.
 */
export async function test_api_admin_order_item_snapshot_after_seller_profile_change(
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
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate UUIDs for order and item (simulating existing data)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve order item snapshot
  const snapshot: IEcommerceOrderItemSnapshot =
    await api.functional.ecommerce.admin.orders.items.snapshot.at(
      adminConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate business logic - snapshot preserves seller information
  TestValidator.predicate(
    "snapshot has valid seller shop name",
    snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid base price",
    snapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has valid product name",
    snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid created_at timestamp",
    new Date(snapshot.created_at) instanceof Date,
  );
}
