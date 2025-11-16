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

/**
 * Test collaborative discussion scenarios where multiple different members
 * participate by replying to comments.
 *
 * This validates realistic discussion workflows where different users engage in
 * conversation through nested comment replies. The test ensures proper
 * authentication-based ownership attribution and correct threading structure
 * across multiple participants.
 *
 * Workflow:
 *
 * 1. Moderator creates a community
 * 2. First member creates a post
 * 3. First member creates a top-level comment
 * 4. Second member replies to first member's comment
 * 5. Third member replies to second member's reply
 * 6. Fourth member replies to third member's reply
 * 7. Validate proper ownership and threading structure
 */
export async function test_api_comment_reply_multiple_members_discussion(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and community
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

  // Create community for discussion
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 2: Create first member and post
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: member1Email,
        password: "password123",
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

  // Create post as first member
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 3: First member creates top-level comment
  const topLevelComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  TestValidator.equals(
    "top-level comment belongs to member1",
    topLevelComment.reddit_community_member_id,
    member1.id,
  );
  TestValidator.equals(
    "top-level comment has depth 0",
    topLevelComment.depth,
    0,
  );

  // Step 4: Create second member and reply to first member's comment
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: member2Email,
        password: "password456",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member2);

  // Second member replies to top-level comment
  const reply1: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply1);
  TestValidator.equals(
    "first reply belongs to member2",
    reply1.reddit_community_member_id,
    member2.id,
  );
  TestValidator.equals(
    "first reply has correct parent",
    reply1.parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals("first reply has depth 1", reply1.depth, 1);

  // Step 5: Create third member and reply to second member's reply
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: member3Email,
        password: "password789",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: true,
        show_activity_feed: false,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member3);

  // Third member replies to second member's reply
  const reply2: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: reply1.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: reply1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply2);
  TestValidator.equals(
    "second reply belongs to member3",
    reply2.reddit_community_member_id,
    member3.id,
  );
  TestValidator.equals(
    "second reply has correct parent",
    reply2.parent_comment_id,
    reply1.id,
  );
  TestValidator.equals("second reply has depth 2", reply2.depth, 2);

  // Step 6: Create fourth member and reply to third member's reply
  const member4Email = typia.random<string & tags.Format<"email">>();
  const member4: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: member4Email,
        password: "password000",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member4);

  // Fourth member replies to third member's reply, creating multi-participant thread
  const reply3: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: reply2.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parent_comment_id: reply2.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply3);
  TestValidator.equals(
    "third reply belongs to member4",
    reply3.reddit_community_member_id,
    member4.id,
  );
  TestValidator.equals(
    "third reply has correct parent",
    reply3.parent_comment_id,
    reply2.id,
  );
  TestValidator.equals("third reply has depth 3", reply3.depth, 3);

  // Validate the entire discussion thread structure
  TestValidator.predicate(
    "all members are distinct",
    member1.id !== member2.id &&
      member2.id !== member3.id &&
      member3.id !== member4.id &&
      member1.id !== member3.id &&
      member1.id !== member4.id &&
      member2.id !== member4.id,
  );

  TestValidator.predicate(
    "all comments belong to correct post",
    topLevelComment.reddit_community_post_id === post.id &&
      reply1.reddit_community_post_id === post.id &&
      reply2.reddit_community_post_id === post.id &&
      reply3.reddit_community_post_id === post.id,
  );

  TestValidator.predicate(
    "depth increases with each reply level",
    topLevelComment.depth === 0 &&
      reply1.depth === 1 &&
      reply2.depth === 2 &&
      reply3.depth === 3,
  );
}
