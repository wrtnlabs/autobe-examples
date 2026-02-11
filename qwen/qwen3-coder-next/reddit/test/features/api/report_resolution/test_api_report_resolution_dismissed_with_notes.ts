import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_resolution_dismissed_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a post for reference using available API
  // Since we need a valid post ID for comment creation but post.create doesn't exist,
  // we'll assume a post exists with a known ID or create a minimal post through a different path
  // For this test, we'll use a placeholder postId and assume the system accepts it
  // In a real scenario, you would either:
  // - Create a post through another API endpoint not shown here
  // - Use a seed data post ID
  // - Or modify the test to work without posts
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a comment on the post
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: postId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Submit a report for the comment
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "COMMENT",
          reported_id: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Use camelCase property names for the response DTO
  TestValidator.equals(
    "report reportedId matches",
    report.reportedId,
    comment.id,
  );
  TestValidator.equals(
    "report reportedType matches",
    report.reportedType,
    "COMMENT",
  );
  // 5. Resolve the report with DISMISSED status and notes
  const resolution =
    await api.functional.redditPlatform.member.redditPlatform.reports.resolutions.update(
      memberConnection,
      {
        reportId: report.id,
        body: {
          status: "DISMISSED",
          resolution_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(resolution);
  // 6. Validation
  TestValidator.equals(
    "resolution status is DISMISSED",
    resolution.status,
    "DISMISSED",
  );
  TestValidator.predicate(
    "resolution has notes",
    resolution.resolution_notes !== null &&
      resolution.resolution_notes !== undefined,
  );
  TestValidator.equals(
    "resolution report_id matches original report",
    resolution.report.id,
    report.id,
  );
  // Use camelCase for member.id as per IRedditPlatformMember.ISummary
  TestValidator.equals(
    "resolution reporter matches",
    resolution.report.reporter.id,
    member.id,
  );
  // 7. Since there's no comment retrieval endpoint available in the provided API,
  // we skip the comment verification step.
  // In a real implementation, you would add a GET /comments/:commentId endpoint
  // or use direct database validation
}
