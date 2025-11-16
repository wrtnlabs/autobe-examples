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

export async function test_api_comment_creation_multiple_levels_deep(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
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
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
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
  typia.assert(member);

  // Step 4: Create a post to hold the comment thread
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create top-level comment (depth 0)
  const comment0: IRedditCommunityComment =
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
  typia.assert(comment0);

  // Step 6: Verify top-level comment has depth 0
  TestValidator.equals("top-level comment depth", comment0.depth, 0);
  TestValidator.equals(
    "top-level comment has no parent",
    comment0.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "top-level comment belongs to post",
    comment0.reddit_community_post_id,
    post.id,
  );

  // Step 7: Create reply to top-level comment (depth 1)
  const comment1: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: comment0.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment1);

  // Step 8: Verify depth 1 comment properties
  TestValidator.equals("depth 1 comment depth", comment1.depth, 1);
  TestValidator.equals(
    "depth 1 comment parent is comment0",
    comment1.parent_comment_id,
    comment0.id,
  );
  TestValidator.equals(
    "depth 1 comment belongs to post",
    comment1.reddit_community_post_id,
    post.id,
  );

  // Step 9: Create reply to depth 1 comment (depth 2)
  const comment2: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: comment1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment2);

  // Step 10: Verify depth 2 comment properties
  TestValidator.equals("depth 2 comment depth", comment2.depth, 2);
  TestValidator.equals(
    "depth 2 comment parent is comment1",
    comment2.parent_comment_id,
    comment1.id,
  );
  TestValidator.equals(
    "depth 2 comment belongs to post",
    comment2.reddit_community_post_id,
    post.id,
  );

  // Step 11: Create reply to depth 2 comment (depth 3)
  const comment3: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: comment2.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment3);

  // Step 12: Verify depth 3 comment properties
  TestValidator.equals("depth 3 comment depth", comment3.depth, 3);
  TestValidator.equals(
    "depth 3 comment parent is comment2",
    comment3.parent_comment_id,
    comment2.id,
  );
  TestValidator.equals(
    "depth 3 comment belongs to post",
    comment3.reddit_community_post_id,
    post.id,
  );

  // Step 13: Verify the complete depth chain
  TestValidator.predicate(
    "depth increments correctly through chain",
    comment1.depth === comment0.depth + 1 &&
      comment2.depth === comment1.depth + 1 &&
      comment3.depth === comment2.depth + 1,
  );

  // Step 14: Verify all comments belong to the same post
  TestValidator.predicate(
    "all comments belong to same post",
    comment0.reddit_community_post_id === post.id &&
      comment1.reddit_community_post_id === post.id &&
      comment2.reddit_community_post_id === post.id &&
      comment3.reddit_community_post_id === post.id,
  );
}
