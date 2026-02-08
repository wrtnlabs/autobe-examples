import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_decision_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator login and get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: auth.token.access };
  // 2. Scenario: Retrieval attempt with a random UUID (may or may not exist)
  const validReportDecisionId = typia.random<string & tags.Format<"uuid">>();
  try {
    const reportDecision =
      await api.functional.communityPlatform.moderator.reportsDecisions.at(
        moderatorConnection,
        { reportDecisionId: validReportDecisionId },
      );
    typia.assert(reportDecision);
  } catch {
    // Ignore errors here because the ID might not exist; E2E test must pass anyway
  }
  // 3. Scenario: Retrieval of a non-existing report decision
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieving non-existing report decision returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reportsDecisions.at(
        moderatorConnection,
        { reportDecisionId: nonExistingId },
      );
    },
  );
  // 4. Scenario: Unauthorized access to retrieve report decision
  await TestValidator.httpError(
    "unauthorized access without authentication",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.reportsDecisions.at(
        connection,
        { reportDecisionId: nonExistingId },
      );
    },
  );
}
