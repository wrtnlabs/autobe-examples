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

export async function test_api_administrator_approval_request_retrieval(
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
        password: typia.random<
          string & tags.Format<"password"> & tags.MinLength<8>
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Retrieve an approved administrator approval request
  // Note: The request ID must reference an existing approved request
  // In real E2E setup, this would be pre-populated by test fixtures
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const approvalRequest =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.at(
      superAdminConnection,
      {
        requestId,
      },
    );
  typia.assert(approvalRequest);
  // 3. Validate the response structure for an approved request
  TestValidator.equals(
    "request status is approved",
    approvalRequest.status,
    "approved",
  );
  // 4. Validate requester information (either member or seller)
  if (approvalRequest.requestingMember !== null) {
    TestValidator.equals(
      "requesting member has valid ID",
      approvalRequest.requestingMember.id !== "",
      true,
    );
    TestValidator.equals(
      "requesting member has valid email",
      approvalRequest.requestingMember.email !== "",
      true,
    );
  }
  if (approvalRequest.requestingSeller !== null) {
    TestValidator.equals(
      "requesting seller has valid ID",
      approvalRequest.requestingSeller.id !== "",
      true,
    );
    TestValidator.equals(
      "requesting seller has valid email",
      approvalRequest.requestingSeller.email !== "",
      true,
    );
    TestValidator.equals(
      "requesting seller has approval status",
      approvalRequest.requestingSeller.approval_status !== "",
      true,
    );
  }
  // 5. Validate reviewing super administrator information
  if (approvalRequest.reviewingSuperAdmin !== null) {
    TestValidator.equals(
      "reviewing super admin has valid ID",
      approvalRequest.reviewingSuperAdmin.id !== "",
      true,
    );
    TestValidator.equals(
      "reviewing super admin has valid email",
      approvalRequest.reviewingSuperAdmin.email !== "",
      true,
    );
  }
  // 6. Validate created administrator information
  if (approvalRequest.createdAdmin !== null) {
    TestValidator.equals(
      "created admin has valid ID",
      approvalRequest.createdAdmin.id !== "",
      true,
    );
    TestValidator.equals(
      "created admin has valid email",
      approvalRequest.createdAdmin.email !== "",
      true,
    );
    TestValidator.equals(
      "created admin has display name",
      approvalRequest.createdAdmin.displayName !== "",
      true,
    );
    TestValidator.equals(
      "created admin has isBanned field",
      typeof approvalRequest.createdAdmin.isBanned === "boolean",
      true,
    );
    // Grade can be 'regular', 'super', or null
    if (
      approvalRequest.createdAdmin.grade !== null &&
      approvalRequest.createdAdmin.grade !== undefined
    ) {
      TestValidator.equals(
        "admin grade is valid",
        approvalRequest.createdAdmin.grade === "regular" ||
          approvalRequest.createdAdmin.grade === "super",
        true,
      );
    }
  }
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    () => !isNaN(Date.parse(approvalRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    () => !isNaN(Date.parse(approvalRequest.updated_at)),
  );
  // 8. Validate soft delete status
  TestValidator.equals(
    "request not soft deleted",
    approvalRequest.deleted_at,
    null,
  );
}
