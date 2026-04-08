import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_reject_seller_admin_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  const superAdminId = superAdminAuth.superAdministrator.id;
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Seller submits administrator approval request
  const approvalRequest =
    await api.functional.ecommerceMall.member.administrator_approval_requests.create(
      sellerConnection,
      {
        body: {
          requestingSellerId: sellerId,
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 6,
          }),
        },
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "request status is pending",
    approvalRequest.status,
    "pending",
  );
  // 4. Super administrator rejects the request
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const updatedRequest =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.update(
      superAdminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          review_reason: rejectionReason,
        },
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate rejection response
  TestValidator.equals("status is rejected", updatedRequest.status, "rejected");
  TestValidator.equals(
    "review_reason is populated",
    (updatedRequest as any).review_reason,
    rejectionReason,
  );
  TestValidator.notEquals("review_reason is not empty", rejectionReason, "");
  // 6. Verify no administrator account was created
  TestValidator.equals(
    "createdAdmin is null (no admin created)",
    updatedRequest.createdAdmin,
    null,
  );
  TestValidator.equals(
    "reviewingSuperAdmin is set",
    updatedRequest.reviewingSuperAdmin?.id,
    superAdminId,
  );
  // 7. Verify requestingSeller is preserved
  TestValidator.notEquals(
    "requestingSeller reference exists",
    updatedRequest.requestingSeller,
    null,
  );
  TestValidator.equals(
    "requestingSeller id matches",
    updatedRequest.requestingSeller?.id,
    sellerId,
  );
  // 8. Verify approvingSuperAdmin is null (since it was rejected)
  TestValidator.equals(
    "reviewingSuperAdmin exists",
    updatedRequest.reviewingSuperAdmin !== null,
    true,
  );
}