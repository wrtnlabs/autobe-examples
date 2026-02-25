import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_reports_create } from "../../../generate/generate_random_reddit_clone_member_comments_reports_create";
import { prepare_random_reddit_clone_content_report } from "../../../prepare/prepare_random_reddit_clone_content_report";

export async function test_api_comment_report_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
    },
  });
  typia.assert(member);
  // 2) Generate a random comment ID for reporting
  // Note: The API doesn't provide endpoints to create posts/comments,
  // so we generate a UUID for testing the report endpoint
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3) Report the comment with reason text
  const report =
    await api.functional.redditClone.member.comments.reports.create(
      memberConnection,
      {
        commentId: commentId,
        body: {
          report_type: "comment" as const,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          comment_id: commentId,
        } satisfies IRedditCloneContentReport.ICreate,
      },
    );
  typia.assert(report);
  // 4) Verify reporter matches member
  TestValidator.equals(
    "reporter matches member",
    report.reporter.id,
    member.id,
  );
  // 5) Verify comment_id matches target comment
  TestValidator.equals(
    "comment matches reported",
    report.comment?.id,
    commentId,
  );
  // 6) Verify report_type is 'comment'
  TestValidator.equals("report type is comment", report.reportType, "comment");
  // 7) Verify status is 'pending'
  TestValidator.equals("report status is pending", report.status, "pending");
}
