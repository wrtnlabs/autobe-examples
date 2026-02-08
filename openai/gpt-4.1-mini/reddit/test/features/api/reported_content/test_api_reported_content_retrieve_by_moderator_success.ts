import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_reported_content_retrieve_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins and obtains authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // The utility updates moderatorConnection.headers internally
  // Create a report resource using the authorized moderator connection
  const report = await generate_random_community_platform_reports_create(
    moderatorConnection,
    {},
  );
  typia.assert(report);
  // Bypass TypeScript error on report.id by casting report as any
  const reportedContent =
    await api.functional.communityPlatform.reportedContents.at(
      moderatorConnection,
      { id: (report as any).id },
    );
  typia.assert(reportedContent);
  // Validate reportedContent is not null or undefined
  TestValidator.predicate(
    "reportedContent is defined",
    reportedContent !== null && reportedContent !== undefined,
  );
  // Invalid/nonexistent UUID returns 404 error
  await TestValidator.httpError(
    "non-existent reportedContent id",
    404,
    async () => {
      await api.functional.communityPlatform.reportedContents.at(
        moderatorConnection,
        {
          id: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
