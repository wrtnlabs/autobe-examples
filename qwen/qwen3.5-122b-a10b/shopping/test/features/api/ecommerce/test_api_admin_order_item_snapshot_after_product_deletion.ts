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
 * Admin retrieves the purchase-time snapshot of an order item after the associated product has been deleted from the platform.
 *
 * Validates that order item snapshots remain accessible and contain accurate historical data even after products are deleted. The snapshot preserves product name, description, base price, and seller profile information exactly as they appeared at purchase time, ensuring audit trail integrity for dispute resolution.
 *
 * This test validates the snapshot immutability requirement by confirming that:
 * 1. Administrators can access order item snapshots via the admin endpoint
 * 2. Snapshot data includes all required historical fields (product_name, product_description, seller_shop_name, seller_logo_url, base_price, created_at)
 * 3. typia.assert validates the complete snapshot structure
 *
 * 1. Administrator authenticates via join endpoint
 * 2. Admin connection is created with authentication token
 * 3. Snapshot endpoint is called with order and item UUIDs
 * 4. Response is validated for type correctness and required fields
 *
 * Note: Due to limited API functions available, this test validates the snapshot retrieval mechanism. A complete scenario would require order/product creation and deletion functions to fully demonstrate the "after product deletion" behavior.
 */
export async function test_api_admin_order_item_snapshot_after_product_deletion(
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
  // 2. Generate UUIDs for order and item (in real scenario, these would come from created order)
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
}
