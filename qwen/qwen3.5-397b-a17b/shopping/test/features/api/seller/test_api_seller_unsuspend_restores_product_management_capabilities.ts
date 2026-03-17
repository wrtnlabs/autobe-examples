import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that after unsuspending a seller, the seller regains full product management capabilities.
 *
 * This test validates the business rule that suspended sellers cannot create or edit products,
 * but unsuspended sellers can. The test workflow:
 * 1. Admin joins and logs in
 * 2. Seller joins and logs in
 * 3. Admin approves the seller registration
 * 4. Admin suspends the seller
 * 5. Admin unsuspends the seller (target endpoint)
 * 6. Verify the seller's suspended status is now false, confirming restored capabilities
 *
 * Note: Product creation/editing endpoints are not available in the provided API functions,
 * so we validate the unsuspension operation and seller status change as the primary
 * verification that capabilities are restored.
 */
export async function test_api_seller_unsuspend_restores_product_management_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Seller setup - join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Admin suspends the seller
  await api.functional.shoppingMall.admin.admin.sellers.suspend(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  // 5. Admin unsuspends the seller (target endpoint)
  const unsuspendedSeller =
    await api.functional.shoppingMall.admin.sellers.unsuspend(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(unsuspendedSeller);
  // 6. Verify the seller's suspended status is now false
  TestValidator.equals(
    "seller should not be suspended after unsuspend",
    unsuspendedSeller.suspended,
    false,
  );
  TestValidator.equals(
    "seller should still be approved",
    unsuspendedSeller.approval_status,
    "APPROVED",
  );
  TestValidator.equals("seller id matches", unsuspendedSeller.id, sellerId);
}
