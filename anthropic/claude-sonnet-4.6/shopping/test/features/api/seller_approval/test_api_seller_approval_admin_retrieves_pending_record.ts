import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_approval_admin_retrieves_pending_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. As seller, submit an approval request (creates a 'pending' record)
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 4. As admin, list seller approvals to find the approvalId of the pending record
  const approvalList =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalList);
  // Find our specific pending approval in the list
  const pendingRecord = approvalList.data.find(
    (record) => record.id === approval.id,
  );
  TestValidator.predicate(
    "pending record found in list",
    pendingRecord !== undefined,
  );
  const approvalId = approval.id;
  // 5. Primary test: Admin retrieves the specific approval record by ID
  const retrieved = await api.functional.shoppingMall.admin.sellerApprovals.at(
    adminConnection,
    {
      approvalId,
    },
  );
  typia.assert(retrieved);
  // 6. Assert business logic fields
  TestValidator.equals("approval id matches", retrieved.id, approvalId);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.equals("reviewed_by is null", retrieved.reviewed_by, null);
  // Assert seller info
  TestValidator.equals(
    "seller id matches",
    retrieved.seller.id,
    sellerAuth.seller.id,
  );
  TestValidator.equals(
    "seller is not banned",
    retrieved.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller is not suspended",
    retrieved.seller.isSuspended,
    false,
  );
}
