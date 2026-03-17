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

export async function test_api_seller_suspension_banned_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  const sellerId = sellerAuthorized.id;
  // 3. Submit seller approval request (seller must be authenticated)
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 4. Approve the seller's registration
  const approvedApproval =
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
  typia.assert(approvedApproval);
  TestValidator.equals(
    "approval status is approved",
    approvedApproval.status,
    "approved",
  );
  // 5. Ban the seller
  const bannedSeller = await api.functional.shoppingMall.superAdmin.sellers.ban(
    superAdminConnection,
    {
      sellerId,
    },
  );
  typia.assert(bannedSeller);
  TestValidator.equals("seller is banned", bannedSeller.isBanned, true);
  TestValidator.equals(
    "seller is not suspended before test",
    bannedSeller.isSuspended,
    false,
  );
  // Test Execution: Attempt to suspend a banned seller — must fail
  await TestValidator.error(
    "suspending a banned seller should be rejected",
    async () => {
      await api.functional.shoppingMall.superAdmin.sellers.suspend(
        superAdminConnection,
        {
          sellerId,
        },
      );
    },
  );
}
