import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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

export async function test_api_report_comment_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create reporter member connection
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterMember = await api.functional.redditPlatform.auth.member.join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(reporterMember);
  // Update reporter connection with token from join response
  reporterConnection.headers = {
    ...reporterConnection.headers,
    Authorization: reporterMember.token.access,
  };
  // 2. Create comment author member connection
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await api.functional.redditPlatform.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(authorMember);
  // 3. Create a post first (using available workaround - create dummy post ID)
  // Since we cannot create posts directly, we'll use a valid UUID for postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create comment by author using the workaround postId
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      authorConnection,
      {
        postId: postId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Report comment by other member (reporter)
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      reporterConnection,
      {
        body: {
          reported_type: "COMMENT",
          reported_id: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Validate report
  TestValidator.equals("reported type", report.reportedType, "COMMENT");
  TestValidator.equals("reported id", report.reportedId, comment.id);
  TestValidator.equals("status", report.status, "PENDING");
  TestValidator.equals("reporter id", report.reporterId, reporterMember.id);
  TestValidator.notEquals(
    "reporter is not author",
    reporterMember.id,
    comment.author_id,
  );
  TestValidator.predicate(
    "reporter info present",
    report.reporter !== null && report.reporter !== undefined,
  );
  TestValidator.equals(
    "author info matches",
    report.reporter.id,
    comment.author.id,
  );
}
