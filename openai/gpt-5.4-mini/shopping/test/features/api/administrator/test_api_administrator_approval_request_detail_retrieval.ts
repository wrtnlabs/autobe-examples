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

export async function test_api_administrator_approval_request_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.at(
      adminConnection,
      {
        administratorApprovalRequestId: approvalRequestId,
      },
    );
  typia.assert(output);
  TestValidator.equals("approval request id", output.id, approvalRequestId);
  TestValidator.predicate(
    "applicant administrator summary exists",
    output.administrator.id.length > 0 && output.administrator.email.length > 0,
  );
  TestValidator.predicate("reason exists", output.reason.length > 0);
  TestValidator.predicate("status exists", output.status.length > 0);
  TestValidator.predicate("createdAt exists", output.createdAt.length > 0);
  TestValidator.predicate("updatedAt exists", output.updatedAt.length > 0);
  if (output.reviewerAdministrator !== null) {
    TestValidator.predicate(
      "reviewer administrator summary exists",
      output.reviewerAdministrator.id.length > 0 &&
        output.reviewerAdministrator.email.length > 0,
    );
  }
  if (output.rejectionReason !== null) {
    TestValidator.predicate(
      "rejection reason exists when present",
      output.rejectionReason.length > 0,
    );
  }
  if (output.reviewedAt !== null) {
    TestValidator.predicate(
      "reviewedAt exists when present",
      output.reviewedAt.length > 0,
    );
  }
}
