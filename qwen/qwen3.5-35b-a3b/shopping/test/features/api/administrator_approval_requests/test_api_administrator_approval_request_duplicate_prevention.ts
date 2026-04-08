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

export async function test_api_administrator_approval_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } as IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResult);
  const customerId: string = joinResult.id;
  // 2. Submit first administrator approval request
  const requestConnection: api.IConnection = { host: connection.host };
  const firstRequest =
    await api.functional.ecommerceMall.member.administrator_approval_requests.create(
      requestConnection,
      {
        body: {
          requestingMemberId: customerId,
          reason:
            "First request for administrator privileges to help moderate the platform",
        } as IEcommerceMallAdministratorApprovalRequests.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 3. Verify first request was created with pending status
  TestValidator.equals(
    "first request status pending",
    firstRequest.status,
    "pending",
  );
  // 4. Attempt second duplicate request with same member ID
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate request returns 409 Conflict",
    [409],
    async () =>
      await api.functional.ecommerceMall.member.administrator_approval_requests.create(
        duplicateConnection,
        {
          body: {
            requestingMemberId: customerId,
            reason:
              "Second attempt - different reason for administrator privileges",
          } as IEcommerceMallAdministratorApprovalRequests.ICreate,
        },
      ),
  );
  // 5. Verify original request remains pending (submit third request to confirm)
  const verificationConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "third attempt also returns 409 Conflict (original still pending)",
    [409],
    async () =>
      await api.functional.ecommerceMall.member.administrator_approval_requests.create(
        verificationConnection,
        {
          body: {
            requestingMemberId: customerId,
            reason: "Third attempt to verify original request unchanged",
          } as IEcommerceMallAdministratorApprovalRequests.ICreate,
        },
      ),
  );
}
