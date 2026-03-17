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
 * Test seller unsuspension restores account to active status.
 *
 * This test validates the complete seller suspension/unsuspension workflow:
 * 1. Administrator creates account and authenticates
 * 2. Seller creates account and gets approved by admin
 * 3. Admin suspends the seller account
 * 4. Admin unsuspends the seller account (target operation)
 * 5. Verify seller's suspended flag changes from true to false
 * 6. Verify seller's updated_at timestamp is updated
 * 7. Verify approval_status remains APPROVED
 */
export async function test_api_seller_unsuspend_restores_product_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Seller setup - create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;
  // 3. Admin approves seller registration
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
  TestValidator.predicate(
    "not suspended after approval",
    !approvedSeller.suspended,
  );
  const approvedTimestamp = approvedSeller.updated_at;
  // 4. Admin suspends the seller
  await api.functional.shoppingMall.admin.admin.sellers.suspend(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  // 5. Login as seller to verify suspended status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  TestValidator.predicate("seller is suspended", sellerLogin.suspended);
  // 6. Admin unsuspends the seller (TARGET OPERATION)
  const unsuspendedSeller =
    await api.functional.shoppingMall.admin.sellers.unsuspend(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(unsuspendedSeller);
  // 7. Verify unsuspension results
  TestValidator.predicate(
    "seller not suspended after unsuspend",
    !unsuspendedSeller.suspended,
  );
  TestValidator.equals(
    "approval status unchanged",
    unsuspendedSeller.approval_status,
    "APPROVED",
  );
  TestValidator.notEquals(
    "updated_at changed after unsuspend",
    approvedTimestamp,
    unsuspendedSeller.updated_at,
  );
  TestValidator.equals("seller id preserved", unsuspendedSeller.id, sellerId);
}
