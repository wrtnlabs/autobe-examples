import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_reports_create } from "../../../generate/generate_random_reddit_like_member_comments_reports_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_comment_report_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member);
  // 2. Create a comment to report (using available posts.comments.create)
  // Note: posts.create endpoint is not available, so we need to use a pre-existing postId
  // In a real test scenario, this would come from database seeding
  const samplePostId = "00000000-0000-0000-0000-000000000000";
  // Create a comment on the sample post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: samplePostId,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Submit a report for the comment
  const report = await api.functional.redditLike.member.comments.reports.create(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Validate report structure
  TestValidator.equals("reporter matches", report.reporter.id, member.id);
  TestValidator.equals(
    "reported comment matches",
    report.reportedComment?.id,
    comment.id,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate("created_at exists", report.created_at !== undefined);
  TestValidator.predicate("updated_at exists", report.updated_at !== undefined);
}
