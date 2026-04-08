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

export async function test_api_super_administrator_reject_admin_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller submits administrator approval request
  const request =
    await api.functional.ecommerceMall.member.administrator_approval_requests.create(
      sellerConnection,
      {
        body: {
          requestingSellerId: sellerAuth.id,
          reason:
            "I need administrative privileges to manage my shop operations effectively",
        } satisfies IEcommerceMallAdministratorApprovalRequests.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("request status is pending", request.status, "pending");
  // 3. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: "Super Admin",
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  // 4. Reject the request
  const rejectionReason =
    "Application does not meet platform requirements at this time";
  const updatedRequest =
    await api.functional.ecommerceMall.superAdministrator.admin_requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "rejected",
          review_reason: rejectionReason,
        } satisfies IEcommerceMallAdministratorApprovalRequests.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Verify rejection response
  TestValidator.equals(
    "request status is rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals("no admin created", updatedRequest.createdAdmin, null);
  TestValidator.predicate(
    "super admin review set",
    updatedRequest.reviewingSuperAdmin !== null,
  );
  // 6. Attempt to update rejected request (should fail)
  await TestValidator.error("Cannot update rejected request", async () => {
    await api.functional.ecommerceMall.superAdministrator.admin_requests.update(
      superAdminConnection,
      {
        requestId: updatedRequest.id,
        body: {
          status: "approved" as const,
        } satisfies IEcommerceMallAdministratorApprovalRequests.IUpdate,
      },
    );
  });
}
