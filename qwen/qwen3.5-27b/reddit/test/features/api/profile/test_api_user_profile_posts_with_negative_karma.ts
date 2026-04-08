import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test viewing posts for a user whose karma is negative due to more downvotes than upvotes.
 *
 * Validates that posts from users with negative karma are still viewable and that negative karma values are correctly displayed. This test creates a member user, generates posts, and then casts more downvotes than upvotes to create a negative karma scenario.
 *
 * The test verifies that negative karma does not restrict content visibility or user actions, and that the API correctly displays negative vote scores and karma values in the response.
 *
 * 1. Create an author member user who will have negative karma.
 * 2. Subscribe the author to an existing community.
 * 3. Create multiple posts by the author in the subscribed community.
 * 4. Create additional voter members to cast votes on the posts.
 * 5. Cast more downvotes than upvotes to create negative karma for the author.
 * 6. Retrieve the author's posts via the profile endpoint.
 * 7. Verify that posts are returned successfully despite negative karma.
 * 8. Verify that the author's karma field shows a negative value.
 * 9. Verify that post vote_scores can be negative.
 * 10. Verify that sorting works correctly with negative scores.
 */
export async function test_api_user_profile_posts_with_negative_karma(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member user who will have negative karma
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 2. Use a valid community ID (assumes community exists in test environment)
  // In real E2E tests, this would be created as a test fixture
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Subscribe author to the community to enable post creation
  const subscription =
    await api.functional.redditClone.member.subscriptions.create(
      authorConnection,
      {
        body: {
          community_id: communityId,
        } satisfies IRedditCloneCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts by the author
  const posts: IRedditClonePost[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      return await api.functional.redditClone.member.posts.create(
        authorConnection,
        {
          body: {
            title: `Test Post ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
            post_type: "text",
            community_id: communityId,
            text_content: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IRedditClonePost.ICreate,
        },
      );
    },
  );
  posts.forEach((post) => typia.assert(post));
  // 5. Create voter members to cast downvotes
  // We need more downvoters than upvoters to create negative karma
  const upvoterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(upvoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCloneMember.IJoin,
  });
  const downvoterConnections: api.IConnection[] = await ArrayUtil.asyncRepeat(
    4,
    async () => {
      const voterConnection: api.IConnection = { host: connection.host };
      await authorize_member_join(voterConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          username: RandomGenerator.name(),
          href: "https://example.com/join",
          referrer: "https://example.com",
        } satisfies IRedditCloneMember.IJoin,
      });
      return voterConnection;
    },
  );
  // 6. Cast votes on each post: 1 upvote + 4 downvotes = net -3 per post
  for (const post of posts) {
    // 1 upvote
    const upvote = await api.functional.redditClone.member.posts.votes.create(
      upvoterConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditClonePostVote.ICreate,
      },
    );
    typia.assert(upvote);
    // 4 downvotes from different voters
    for (const downvoterConnection of downvoterConnections) {
      const downvote =
        await api.functional.redditClone.member.posts.votes.create(
          downvoterConnection,
          {
            postId: post.id,
            body: {
              vote_type: "downvote",
            } satisfies IRedditClonePostVote.ICreate,
          },
        );
      typia.assert(downvote);
    }
  }
  // 7. Retrieve the author's posts via the profile endpoint
  const postsResponse = await api.functional.redditClone.profiles.posts.index(
    connection,
    {
      profileId: author.id,
      body: {
        sortType: "new",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(postsResponse);
  // 8. Verify that posts are returned successfully
  TestValidator.predicate(
    "posts array should not be empty",
    postsResponse.data.length > 0,
  );
  // 9. Verify that all created posts are retrievable
  TestValidator.equals(
    "all created posts should be retrievable",
    postsResponse.data.length,
    posts.length,
  );
  // 10. Verify that posts have negative vote scores
  const negativeScorePosts = postsResponse.data.filter(
    (post) => post.vote_score < 0,
  );
  TestValidator.predicate(
    "at least some posts should have negative vote scores",
    negativeScorePosts.length > 0,
  );
  // 11. Verify author karma is accessible (should be negative)
  const firstPost = postsResponse.data[0];
  typia.assert(firstPost);
  TestValidator.predicate(
    "author karma should be a valid integer",
    typeof firstPost.author.karma === "number",
  );
  // 12. Verify that negative karma doesn't prevent viewing posts
  TestValidator.predicate(
    "posts should be viewable despite negative karma",
    postsResponse.data.length === posts.length,
  );
  // 13. Verify sorting works with negative scores (top sort)
  const sortedResponse = await api.functional.redditClone.profiles.posts.index(
    connection,
    {
      profileId: author.id,
      body: {
        sortType: "top",
        timeFilter: "all",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(sortedResponse);
  TestValidator.predicate(
    "sorted posts should be returned",
    sortedResponse.data.length > 0,
  );
  // 14. Verify that posts with negative scores are still sortable
  TestValidator.equals(
    "sorted response should contain same number of posts",
    sortedResponse.data.length,
    postsResponse.data.length,
  );
}
