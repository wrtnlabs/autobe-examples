import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_report_decision_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a connection for a user who is NOT moderator or admin by NOT performing moderator join authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Attempt submitting a report decision as unauthorized user
  await TestValidator.httpError(
    "reject unauthorized report decision submission",
    401, // Unauthorized status code
    async () => {
      // Compose a random but valid report decision request payload
      const body = {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        decision: "approve" as const,
        comment: "Trying to decide report without authorization",
      } satisfies ICommunityPlatformReportsDecision.IRequest;
      // Use updateDecision SDK function directly with unauthorizedConnection
      // Since no utility function exists for unauthorized actors
      await api.functional.communityPlatform.moderator.reports_decisions.updateDecision(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
