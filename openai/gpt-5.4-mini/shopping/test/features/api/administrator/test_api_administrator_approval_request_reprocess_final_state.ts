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

export async function test_api_administrator_approval_request_reprocess_final_state(
  connection: api.IConnection,
): Promise<void> {
  const reviewerConnection: api.IConnection = { host: connection.host };
  const reviewer = await authorize_administrator_join(reviewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(reviewer);
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const completedStatuses = ["approved", "rejected"] as const;
  await ArrayUtil.asyncForEach(completedStatuses, async (status) => {
    await TestValidator.error(
      `cannot reprocess a completed administrator approval request: ${status}`,
      async () => {
        await api.functional.mallPlatform.administrator.administratorApprovalRequests.update(
          reviewerConnection,
          {
            administratorApprovalRequestId: requestId,
            body: {
              status,
              rejectionReason:
                status === "rejected"
                  ? RandomGenerator.paragraph({ sentences: 2 })
                  : null,
            } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
          },
        );
      },
    );
  });
}
