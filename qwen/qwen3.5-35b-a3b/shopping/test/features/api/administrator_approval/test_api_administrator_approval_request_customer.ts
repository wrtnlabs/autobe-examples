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

export async function test_api_administrator_approval_request_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberData);
  // 2. Submit administrator approval request
  const requestConnection: api.IConnection = { host: connection.host };
  requestConnection.headers = {
    Authorization: memberData.token.access,
  };
  const reason =
    "I have extensive platform knowledge and wish to contribute to platform governance by reviewing seller applications and managing community standards";
  const approvalRequest =
    await api.functional.ecommerceMall.member.administrator_approval_requests.create(
      requestConnection,
      {
        body: {
          requestingMemberId: memberData.id,
          reason: reason,
        },
      } as IEcommerceMallAdministratorApprovalRequests.ICreate,
    );
  typia.assert(approvalRequest);
  // 3. Validate response structure
  TestValidator.equals(
    "request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals("reason matches input", approvalRequest.reason, reason);
  TestValidator.equals(
    "requestingMember matches customer",
    approvalRequest.requestingMember?.id,
    memberData.id,
  );
  TestValidator.equals(
    "requestingSeller is null for customer",
    approvalRequest.requestingSeller,
    null,
  );
  TestValidator.equals(
    "reviewingSuperAdmin is null",
    approvalRequest.reviewingSuperAdmin,
    null,
  );
  TestValidator.equals(
    "createdAdmin is null",
    approvalRequest.createdAdmin,
    null,
  );
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(approvalRequest.id),
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(approvalRequest.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(approvalRequest.updated_at).getTime() > 0,
  );
  TestValidator.equals("deleted_at is null", approvalRequest.deleted_at, null);
}
