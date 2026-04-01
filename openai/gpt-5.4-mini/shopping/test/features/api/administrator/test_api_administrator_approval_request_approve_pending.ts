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

export async function test_api_administrator_approval_request_approve_pending(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const administratorApprovalRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.update(
      administratorConnection,
      {
        administratorApprovalRequestId,
        body: {
          status: "approved",
        } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals("approval status", output.status, "approved");
  TestValidator.notEquals(
    "reviewer administrator should be recorded",
    output.reviewerAdministrator,
    null,
  );
  TestValidator.notEquals(
    "reviewedAt should be populated",
    output.reviewedAt,
    null,
  );
  TestValidator.notEquals(
    "administrator should be present",
    output.administrator,
    null,
  );
  TestValidator.notEquals(
    "createdAt should be present",
    output.createdAt,
    null,
  );
  TestValidator.equals(
    "rejectionReason should be null when approved",
    output.rejectionReason,
    null,
  );
}
