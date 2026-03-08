import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_approval_on_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two members (comment author and reporter)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const author = await authorize_member_join(authorConnection, {
    body: authorData,
  });
  typia.assert(author);
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const reporter = await authorize_member_join(reporterConnection, {
    body: reporterData,
  });
  typia.assert(reporter);
  // 2. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    bio: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    avatar_url: null,
  } satisfies IRedditLikeModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  // 3. Create a test post ID for the comment (using mock data since post creation is not available)
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  // 4. Author creates a comment on the post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    authorConnection,
    {
      postId: mockPostId,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parent_comment_id: null,
      },
    },
  );
  typia.assert(comment);
  // 5. Reporter creates a report for the comment
  const report = await api.functional.redditLike.member.reports.create(
    reporterConnection,
    {
      body: {
        reported_comment_id: comment.id,
        reason: "Inappropriate content",
      },
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Moderator approves the report
  await api.functional.redditLike.moderator.reports.approve(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  // 7. Verify report status changed to approved
  const reports = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "approved",
        reported_comment_id: report.id,
      },
    },
  );
  typia.assert(reports);
  const foundReport = reports.data.find((r) => r.id === report.id);
  TestValidator.notEquals(
    "report found in approved list",
    foundReport,
    undefined,
  );
  TestValidator.equals(
    "report status is approved",
    foundReport?.status,
    "approved",
  );
  // 8. Verify comment is deleted by checking no pending reports exist
  const pendingReports =
    await api.functional.redditLike.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          reported_comment_id: report.id,
        },
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals(
    "no pending reports after approval",
    pendingReports.data.length,
    0,
  );
}
