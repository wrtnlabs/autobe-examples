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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_request_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
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
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a pre-existing administrator approval request with UUID
  // Note: Since no create API exists for approval requests, we test with a generated UUID
  // In real test scenario, this request would be pre-populated in the test database
  const rejectedRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the rejected administrator approval request
  const rejectedRequest: IEcommerceMallAdministratorApprovalRequests =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.at(
      superAdminConnection,
      {
        requestId: rejectedRequestId,
      },
    );
  typia.assert(rejectedRequest);
  // 4. Validate rejected request structure
  TestValidator.equals(
    "request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejection reason is present",
    rejectedRequest.reason,
    null,
  );
  TestValidator.predicate(
    "requesting member or seller is present",
    () =>
      rejectedRequest.requestingMember !== null ||
      rejectedRequest.requestingSeller !== null,
  );
  TestValidator.notEquals(
    "reviewing super admin is present",
    rejectedRequest.reviewingSuperAdmin,
    null,
  );
  TestValidator.equals(
    "created admin is null for rejected request",
    rejectedRequest.createdAdmin,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    rejectedRequest.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    () => !isNaN(Date.parse(rejectedRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 format",
    () => !isNaN(Date.parse(rejectedRequest.updated_at)),
  );
}
