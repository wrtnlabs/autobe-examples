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
import { generate_random_community_platform_moderator_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_moderator_reports_decisions_create_report_decision";
import { prepare_random_community_platform_reports_decision } from "../../../prepare/prepare_random_community_platform_reports_decision";

export async function test_api_reports_decisions_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as moderator by joining
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create a report decision record for testing
  const reportDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(reportDecision);
  // 3. Attempt to retrieve non-existent report decision with random UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  // Ensure the randomId does not match the created one
  if (randomId === reportDecision.id) {
    throw new Error(
      "Random UUID matched the created report decision ID, retry test execution",
    );
  }
  // 4. Test that fetching with randomId results in 404 Not Found error
  await TestValidator.httpError(
    "retrieve non-existent report decision returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.at(
        moderatorConnection,
        { id: randomId },
      );
    },
  );
  // 5. Test unauthorized access denied with base connection (no auth)
  await TestValidator.httpError(
    "unauthorized access denied on non-authenticated connection",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.at(
        connection,
        { id: reportDecision.id },
      );
    },
  );
}
