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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_moderator_reports_at_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join to obtain moderator access token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<string & tags.Format<"email">>().split("@")[0],
        displayName: "ModUser",
        bio: "I am a moderator",
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // moderatorConnection.headers.authorization is set internally by authorize_moderator_join
  // 2. User join to obtain user access token
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: typia.random<string & tags.Format<"email">>().split("@")[0],
      displayName: "User1",
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: null,
    },
  });
  typia.assert(userAuthorized);
  // userConnection.headers.authorization is set internally by authorize_user_join
  // 3. User creates a report (prerequisite)
  const reportBody: ICommunityPlatformReport.ICreate = {
    // Minimal valid report create payload
    targetType: "post",
    targetId: typia.random<string & tags.Format<"uuid">>(),
    reasonId: typia.random<string & tags.Format<"uuid">>(),
    description: "Inappropriate content",
  };
  const createdReport =
    await api.functional.communityPlatform.user.reports.create(userConnection, {
      body: reportBody,
    });
  typia.assert(createdReport);
  // 4. Moderator fetches the report details using reportId
  const fetchedReport =
    await api.functional.communityPlatform.moderator.reports.at(
      moderatorConnection,
      { reportId: createdReport.id },
    );
  typia.assert(fetchedReport);
  // 5. Validate fetched report structure and fields
  typia.assert(fetchedReport.user);
  typia.assert(fetchedReport.reportReason);
  if (fetchedReport.reportedContents) {
    for (const content of fetchedReport.reportedContents) {
      typia.assert(content);
    }
  }
  if (fetchedReport.decisions) {
    for (const decision of fetchedReport.decisions) {
      typia.assert(decision);
    }
  }
  TestValidator.predicate(
    "Report has valid status",
    typeof fetchedReport.status === "string" && fetchedReport.status.length > 0,
  );
  TestValidator.predicate(
    "Report has valid createdAt timestamp",
    typeof fetchedReport.createdAt === "string" &&
      fetchedReport.createdAt.length > 0,
  );
  TestValidator.predicate(
    "Report has valid updatedAt timestamp",
    typeof fetchedReport.updatedAt === "string" &&
      fetchedReport.updatedAt.length > 0,
  );
  TestValidator.equals(
    "Fetched report ID matches created report ID",
    fetchedReport.id,
    createdReport.id,
  );
}
