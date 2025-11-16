import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_comment_reply_multi_level_threading(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community to host the discussion
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 4 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for posting and commenting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a post as the root of the discussion thread
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create top-level comment (depth 0, no parent)
  const topLevelComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);

  // Validate top-level comment
  TestValidator.equals(
    "top-level comment has correct post reference",
    topLevelComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "top-level comment has depth 0",
    topLevelComment.depth,
    0,
  );

  // Step 6: Create first-level reply (depth 1, parent = top-level comment)
  const firstReply: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(firstReply);

  // Validate first-level reply
  TestValidator.equals(
    "first reply has correct post reference",
    firstReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "first reply parent is top-level comment",
    firstReply.parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals("first reply has depth 1", firstReply.depth, 1);
  TestValidator.notEquals(
    "first reply has unique ID",
    firstReply.id,
    topLevelComment.id,
  );

  // Step 7: Create second-level reply (depth 2, parent = first reply)
  const secondReply: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: firstReply.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parent_comment_id: firstReply.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(secondReply);

  // Validate second-level reply
  TestValidator.equals(
    "second reply has correct post reference",
    secondReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "second reply parent is first reply",
    secondReply.parent_comment_id,
    firstReply.id,
  );
  TestValidator.equals("second reply has depth 2", secondReply.depth, 2);
  TestValidator.notEquals(
    "second reply has unique ID different from first reply",
    secondReply.id,
    firstReply.id,
  );
  TestValidator.notEquals(
    "second reply has unique ID different from top-level",
    secondReply.id,
    topLevelComment.id,
  );

  // Step 8: Create third-level reply (depth 3, parent = second reply)
  const thirdReply: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: secondReply.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 6 }),
          parent_comment_id: secondReply.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(thirdReply);

  // Validate third-level reply
  TestValidator.equals(
    "third reply has correct post reference",
    thirdReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "third reply parent is second reply",
    thirdReply.parent_comment_id,
    secondReply.id,
  );
  TestValidator.equals("third reply has depth 3", thirdReply.depth, 3);
  TestValidator.notEquals(
    "third reply has unique ID different from second reply",
    thirdReply.id,
    secondReply.id,
  );
  TestValidator.notEquals(
    "third reply has unique ID different from first reply",
    thirdReply.id,
    firstReply.id,
  );
  TestValidator.notEquals(
    "third reply has unique ID different from top-level",
    thirdReply.id,
    topLevelComment.id,
  );

  // Final validation: verify all comments maintain same post context
  TestValidator.predicate(
    "all nested comments reference the same post",
    topLevelComment.reddit_community_post_id === post.id &&
      firstReply.reddit_community_post_id === post.id &&
      secondReply.reddit_community_post_id === post.id &&
      thirdReply.reddit_community_post_id === post.id,
  );
}
