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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_reporting_create_report_on_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication: join a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Prepare a dummy post ID to report
  // Since no API given to create or list posts, we generate a UUID v4 string to simulate existing post
  const dummyPostId = typia.random<string & typia.tags.Format<"uuid">>();
  // 3. Obtain a report reason to use
  // Since no report reason list API given, create a valid dummy report reason
  const dummyReason: ICommunityPlatformReportReason.ISummary = {
    id: typia.random<string & typia.tags.Format<"uuid">>(),
    reasonText: RandomGenerator.paragraph({ sentences: 1 }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  // 4. Compose the report create request
  const createBody = {
    communityPlatformReportedPostId: dummyPostId,
    communityPlatformReportedCommentId: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    communityPlatformReportReasonId: dummyReason.id,
  } satisfies ICommunityPlatformReport.ICreate;
  // 5. Make the report create API call
  const report = await api.functional.communityPlatform.user.reports.create(
    userConnection,
    {
      body: createBody,
    },
  );
  // 6. Validate the response
  typia.assert(report);
  // 7. Logical assertions
  TestValidator.predicate("report ID present", !!report.id);
  TestValidator.equals("report status", report.status, "pending");
  TestValidator.equals(
    "report reason ID matches",
    report.communityPlatformReportReasonId,
    dummyReason.id,
  );
  TestValidator.equals(
    "reporter user ID matches",
    report.communityPlatformUserId,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "report description match",
    report.description === createBody.description,
  );
  // 8. Validate linked user summary
  typia.assert(report.user);
  TestValidator.equals(
    "user id in report matches",
    report.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "user email in report matches",
    report.user.email,
    authorizedUser.email,
  );
  // 9. Validate reported contents linked
  TestValidator.predicate(
    "reportedContents has the post",
    report.reportedContents.some(
      (content) => content.communityPlatformReportedPostId === dummyPostId,
    ),
  );
}
