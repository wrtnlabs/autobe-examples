import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_approval_requests_decisions_create } from "../../../generate/generate_random_mall_platform_administrator_approval_requests_decisions_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_decision_finalized_request_immutable(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IMallPlatformAdministrator.IJoin;
  const authorized = await authorize_administrator_join(adminConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  const approvalRequest =
    await api.functional.mallPlatform.administrator.approvalRequests.decisions.create(
      adminConnection,
      {
        approvalRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.predicate(
    "initial approval request is finalized",
    approvalRequest.status === "approved" ||
      approvalRequest.status === "rejected",
  );
  const snapshotBefore = {
    status: approvalRequest.status,
    reviewerAdministrator: approvalRequest.reviewerAdministrator,
    rejectionReason: approvalRequest.rejectionReason,
    reviewedAt: approvalRequest.reviewedAt,
    updatedAt: approvalRequest.updatedAt,
  };
  await TestValidator.error(
    "finalized approval request cannot be decided again",
    async () => {
      await api.functional.mallPlatform.administrator.approvalRequests.decisions.create(
        adminConnection,
        {
          approvalRequestId: approvalRequest.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
        },
      );
    },
  );
  const unchanged =
    await api.functional.mallPlatform.administrator.approvalRequests.decisions.create(
      adminConnection,
      {
        approvalRequestId: approvalRequest.id,
        body: {
          reason: approvalRequest.reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(unchanged);
  TestValidator.equals(
    "finalized approval request status remains immutable",
    unchanged.status,
    snapshotBefore.status,
  );
  TestValidator.equals(
    "finalized approval request reviewer remains immutable",
    unchanged.reviewerAdministrator,
    snapshotBefore.reviewerAdministrator,
  );
  TestValidator.equals(
    "finalized approval request rejection reason remains immutable",
    unchanged.rejectionReason,
    snapshotBefore.rejectionReason,
  );
  TestValidator.equals(
    "finalized approval request reviewedAt remains immutable",
    unchanged.reviewedAt,
    snapshotBefore.reviewedAt,
  );
  TestValidator.equals(
    "finalized approval request updatedAt remains immutable",
    unchanged.updatedAt,
    snapshotBefore.updatedAt,
  );
}
