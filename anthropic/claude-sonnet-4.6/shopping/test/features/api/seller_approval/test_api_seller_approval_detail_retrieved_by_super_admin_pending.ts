import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
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

export async function test_api_seller_approval_detail_retrieved_by_super_admin_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register seller with a known email
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
    },
  });
  // 3. Seller submits an approval request, creating a pending SellerApproval record
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  const approvalId = approval.id;
  // 4. SuperAdmin lists seller approvals filtered by seller email to confirm the record exists
  const approvalList =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalList);
  // Confirm our approval appears in the listing
  const found = approvalList.data.find((a) => a.id === approvalId);
  TestValidator.predicate("approval found in listing", found !== undefined);
  // 5. SuperAdmin retrieves the full detail of the specific approval record
  const approvalDetail =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.at(
      superAdminConnection,
      {
        approvalId,
      },
    );
  typia.assert(approvalDetail);
  // 6. Validate approval detail fields
  TestValidator.equals(
    "approval id matches requested id",
    approvalDetail.id,
    approvalId,
  );
  TestValidator.equals(
    "approval status is pending",
    approvalDetail.status,
    "pending",
  );
  TestValidator.equals(
    "seller email matches registration",
    approvalDetail.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller is not banned",
    approvalDetail.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller is not suspended",
    approvalDetail.seller.isSuspended,
    false,
  );
  // For a pending approval, all review-related fields must be null
  TestValidator.equals(
    "reviewed_at is null for pending",
    approvalDetail.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for pending",
    approvalDetail.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewed_by is null for pending",
    approvalDetail.reviewed_by,
    null,
  );
  // submitted_at must be a non-null datetime string
  TestValidator.predicate(
    "submitted_at is a non-null datetime",
    typeof approvalDetail.submitted_at === "string" &&
      approvalDetail.submitted_at.length > 0,
  );
}
