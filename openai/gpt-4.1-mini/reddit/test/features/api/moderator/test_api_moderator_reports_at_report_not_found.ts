import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
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

export async function test_api_moderator_reports_at_report_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Negative test for GET fetching report at non-existing reportId
  // 1. Moderator joins to get authorized connection
  // 2. Use a random UUID as a non-existing reportId to trigger 404 error
  // 3. Call GET /communityPlatform/moderator/reports/{reportId} with non-existing ID
  // 4. Expect HttpError with status 404 to be thrown
  // Step 1. Moderator Join - authenticated moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // Step 2. Generate random UUID as non-existing reportId
  const nonExistingReportId = typia.random<string & tags.Format<"uuid">>();
  // Step 3 & 4. Assert that fetching non-existing report throws 404 HttpError
  await TestValidator.httpError(
    "fetching non-existing report should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(
        moderatorConnection,
        {
          reportId: nonExistingReportId,
        },
      );
    },
  );
}
