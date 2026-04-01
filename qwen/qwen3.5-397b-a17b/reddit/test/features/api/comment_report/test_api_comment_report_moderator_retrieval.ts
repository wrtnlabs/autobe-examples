import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_comments_reports_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

export async function test_api_comment_report_moderator_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerUsername = ownerAuth.token.access;
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Add moderator to community (owner adds moderator)
  const moderatorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Create content creator account
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(creatorAuth);
  // 6. Create post in community (by creator)
  const post = await api.functional.redditCommunity.member.posts.create(
    creatorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.name(3),
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Create comment on post (by creator)
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      creatorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 8. Create multiple reports against the comment
  // First report from owner
  const report1 =
    await generate_random_reddit_community_member_comments_reports_create(
      ownerConnection,
      {
        body: {
          reason: "This comment violates community guidelines - spam content",
        } satisfies IRedditCommunityCommentReport.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report1);
  // Second report from moderator
  const report2 =
    await generate_random_reddit_community_member_comments_reports_create(
      moderatorConnection,
      {
        body: {
          reason: "This comment contains inappropriate language",
        } satisfies IRedditCommunityCommentReport.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report2);
  // 9. Retrieve reports as moderator
  const reportsResponse =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  // 10. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    reportsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(reportsResponse.data),
  );
  TestValidator.equals(
    "total records count",
    reportsResponse.pagination.records,
    2,
  );
  TestValidator.equals("data array length", reportsResponse.data.length, 2);
  TestValidator.equals("current page", reportsResponse.pagination.current, 1);
  TestValidator.predicate(
    "total pages >= 1",
    reportsResponse.pagination.pages >= 1,
  );
  // 11. Validate each report structure
  for (const report of reportsResponse.data) {
    TestValidator.predicate("report has id", report.id !== undefined);
    TestValidator.predicate("report has reason", report.reason !== undefined);
    TestValidator.equals("report status is PENDING", report.status, "PENDING");
    TestValidator.predicate(
      "report has created_at",
      report.created_at !== undefined,
    );
    TestValidator.predicate(
      "report has reporter",
      report.reporter !== undefined,
    );
    TestValidator.predicate(
      "reporter has username",
      report.reporter.username !== undefined,
    );
    TestValidator.predicate("report has comment", report.comment !== undefined);
    TestValidator.predicate(
      "comment has content",
      report.comment.content !== undefined,
    );
    TestValidator.predicate(
      "comment has author",
      report.comment.author !== undefined,
    );
  }
  // 12. Verify both reports have different reasons
  const reasons = reportsResponse.data.map((r) => r.reason);
  TestValidator.predicate(
    "has spam report",
    reasons.some((r) => r.includes("spam")),
  );
  TestValidator.predicate(
    "has inappropriate language report",
    reasons.some((r) => r.includes("inappropriate")),
  );
}
