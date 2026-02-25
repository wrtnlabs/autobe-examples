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

export async function test_api_moderator_report_create_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins the system
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  typia.assert(moderator);
  // Update moderatorConnection with Authorization header
  moderatorConnection.headers ??= {};
  moderatorConnection.headers["Authorization"] = moderator.token.access;
  // 2. Prepare a valid report reason
  // Since no API to get real report reasons, generate one randomly
  const reasonId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare a valid post ID to report
  // We must create a valid postId. Since there's no post creation in dependencies,
  // generate a valid UUID for post ID as a mock on the assumption that report API accepts it.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create report request body
  const body = {
    communityPlatformReportedPostId: postId,
    communityPlatformReportedCommentId: null,
    communityPlatformReportReasonId: reasonId,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;
  // 5. Create the report
  const report =
    await api.functional.communityPlatform.moderator.reportedContents.create(
      moderatorConnection,
      { body },
    );
  typia.assert(report);
  // 6. Validate the fields
  TestValidator.predicate(
    "report id exists",
    typeof report.id === "string" && report.id.length > 0,
  );
  TestValidator.equals(
    "report reason id matches",
    report.communityPlatformReportReasonId,
    reasonId,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate(
    "report description matches",
    report.description === body.description,
  );
  TestValidator.predicate(
    "reported contents include postId",
    ArrayUtil.has(
      report.reportedContents,
      (content) => content.communityPlatformReportedPostId === postId,
    ),
  );
  TestValidator.predicate(
    "createdAt and updatedAt are valid iso strings",
    typeof report.createdAt === "string" &&
      typeof report.updatedAt === "string",
  );
}
