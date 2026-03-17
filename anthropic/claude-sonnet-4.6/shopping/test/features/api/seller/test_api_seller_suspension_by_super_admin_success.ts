import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_suspension_by_super_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  const sellerShopName = sellerAuthorized.shopName;
  const sellerCreatedAt = sellerAuthorized.createdAt;
  // 3. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 4. Super admin approves seller registration
  const updatedApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  TestValidator.equals(
    "approval status is approved",
    updatedApproval.status,
    "approved",
  );
  // 5. Capture pre-suspension seller updatedAt from the approval's seller summary
  const preSuspensionUpdatedAt = updatedApproval.seller.updatedAt;
  // 6. Super admin suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.superAdmin.sellers.suspend(
      superAdminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(suspendedSeller);
  // 7. Assert suspension results
  TestValidator.equals("seller id unchanged", suspendedSeller.id, sellerId);
  TestValidator.equals(
    "seller email unchanged",
    suspendedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller shopName unchanged",
    suspendedSeller.shopName,
    sellerShopName,
  );
  TestValidator.equals(
    "seller createdAt unchanged",
    suspendedSeller.createdAt,
    sellerCreatedAt,
  );
  TestValidator.equals(
    "isSuspended is true",
    suspendedSeller.isSuspended,
    true,
  );
  TestValidator.equals(
    "isBanned remains false",
    suspendedSeller.isBanned,
    false,
  );
  TestValidator.equals(
    "deletedAt remains null",
    suspendedSeller.deletedAt,
    null,
  );
  TestValidator.notEquals(
    "updatedAt changed after suspension",
    suspendedSeller.updatedAt,
    preSuspensionUpdatedAt,
  );
}
