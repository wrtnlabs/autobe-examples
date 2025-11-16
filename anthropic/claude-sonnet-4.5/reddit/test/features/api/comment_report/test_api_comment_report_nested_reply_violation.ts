import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

export async function test_api_comment_report_nested_reply_violation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 4 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member 1 (post author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: member1Email,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member1);

  // Step 4: Create post
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create member 2 (top-level comment author)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: member2Email,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: null,
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member2);

  // Step 6: Create top-level comment (depth 0)
  const topLevelComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  TestValidator.equals(
    "top-level comment depth should be 0",
    topLevelComment.depth,
    0,
  );

  // Step 7: Create member 3 (nested reply author)
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: member3Email,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: false,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member3);

  // Step 8: Create nested reply (depth 1)
  const nestedReply: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  TestValidator.predicate(
    "nested reply depth should be greater than 0",
    nestedReply.depth > 0,
  );
  TestValidator.equals(
    "nested reply parent should match top-level comment",
    nestedReply.parent_comment_id,
    topLevelComment.id,
  );

  // Step 9: Create member 4 (reporter)
  const member4Email = typia.random<string & tags.Format<"email">>();
  const member4: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: member4Email,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member4);

  // Step 10: Report the nested reply comment
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.member.comments.reports.create(
      connection,
      {
        commentId: nestedReply.id,
        body: {
          content_type: "comment",
          target_content_id: nestedReply.id,
          reddit_community_community_id: community.id,
          category: "harassment",
          description: "This nested reply contains offensive language",
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 11: Validate report structure
  TestValidator.equals(
    "report content type should be comment",
    report.content_type,
    "comment",
  );
  TestValidator.equals(
    "report category should be harassment",
    report.category,
    "harassment",
  );
  TestValidator.equals(
    "report should reference correct community",
    report.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "report should be from member 4",
    report.reddit_community_member_id,
    member4.id,
  );
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );

  // Step 12: Validate target comment information
  if (report.target_comment) {
    TestValidator.equals(
      "target comment ID should match nested reply",
      report.target_comment.id,
      nestedReply.id,
    );
    TestValidator.predicate(
      "target comment depth should be greater than 0",
      report.target_comment.depth > 0,
    );
    TestValidator.equals(
      "target comment depth should match nested reply depth",
      report.target_comment.depth,
      nestedReply.depth,
    );
  }
}
