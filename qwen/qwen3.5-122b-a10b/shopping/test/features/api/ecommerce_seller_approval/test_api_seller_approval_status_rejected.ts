import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_approval_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminJoinEmail,
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Administrator logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinEmail,
      password: adminPassword,
    } satisfies IEcommerceAdmin.ILogin,
  });
  // 3. Seller registers (creates pending approval)
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerJoinEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 4. Get seller approval ID from seller summary
  const sellerApprovalId = sellerJoin.id;
  // 5. Administrator rejects seller approval with reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 5 });
  const approvalUpdate = await api.functional.ecommerce.admin.approvals.update(
    adminLoginConnection,
    {
      approvalId: sellerApprovalId,
      body: {
        status: "rejected",
        rejection_reason: rejectionReason,
      } satisfies IEcommerceSellerApproval.IUpdate,
    },
  );
  typia.assert(approvalUpdate);
  // 6. Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoinEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.ILogin,
  });
  // 7. Seller queries approval status
  const approvalStatus =
    await api.functional.ecommerce.seller.approval_status.at(
      sellerLoginConnection,
    );
  typia.assert(approvalStatus);
  // 8-11. Validate rejection details
  TestValidator.equals("status is rejected", approvalStatus.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    approvalStatus.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedAt is populated",
    approvalStatus.reviewedAt !== null &&
      approvalStatus.reviewedAt !== undefined,
  );
  TestValidator.predicate(
    "reviewedByAdmin exists",
    approvalStatus.reviewedByAdmin !== null &&
      approvalStatus.reviewedByAdmin !== undefined,
  );
}
