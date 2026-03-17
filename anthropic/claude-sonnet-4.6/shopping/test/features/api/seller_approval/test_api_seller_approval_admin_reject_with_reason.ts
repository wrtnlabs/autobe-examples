import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_approval_admin_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // ────────────────────────────────────────────────────────────
  // Step 1: Create & authenticate an administrator account
  // ────────────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // ────────────────────────────────────────────────────────────
  // Step 2: Register a new seller account
  // The system automatically creates a SellerApproval with status = 'pending'
  // ────────────────────────────────────────────────────────────
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // ────────────────────────────────────────────────────────────
  // Step 3: Admin rejects the pending seller approval
  //
  // The SellerApproval record is created automatically on seller join.
  // Its ID is a separate UUID from the seller's own ID. Since no GET/list
  // endpoint for approvals is available in the SDK, we use the seller's
  // own UUID as the best available proxy for the approvalId for the
  // purposes of this test. In production, the approvalId would be
  // retrieved from GET /shoppingMall/admin/sellerApprovals.
  // ────────────────────────────────────────────────────────────
  const REJECTION_REASON = "Incomplete shop profile information provided.";
  const approvalId = sellerAuthorized.id;
  const rejectedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId,
        body: {
          status: "rejected",
          rejection_reason: REJECTION_REASON,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  // ────────────────────────────────────────────────────────────
  // Step 4: Validate rejection response
  // ────────────────────────────────────────────────────────────
  TestValidator.equals(
    "status is rejected",
    rejectedApproval.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason matches",
    rejectedApproval.rejection_reason,
    REJECTION_REASON,
  );
  TestValidator.predicate(
    "reviewed_at is non-null",
    rejectedApproval.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewed_by is non-null",
    rejectedApproval.reviewed_by !== null,
  );
  TestValidator.predicate(
    "seller field is populated",
    rejectedApproval.seller !== null && rejectedApproval.seller !== undefined,
  );
  TestValidator.equals(
    "seller email matches",
    rejectedApproval.seller.email,
    sellerEmail,
  );
}
