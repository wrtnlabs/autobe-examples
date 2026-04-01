import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test the successful removal of a downvote from a post.
 *
 * This test validates that removing a downvote allows the user to cast
 * a new vote on the same post, demonstrating the vote removal functionality.
 *
 * Test Flow:
 * 1. Create voter member account
 * 2. Create post author member account
 * 3. Create a community
 * 4. Voter subscribes to the community
 * 5. Post author creates a text post
 * 6. Voter casts a downvote on the post
 * 7. Remove the downvote (vote erase)
 * 8. Verify voter can cast a new vote (upvote) on the same post after removal
 */
export async function test_api_post_vote_removal_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `voter_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 2. Create post author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `author_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 3. Create a community (as author)
  const communityName = `community_${RandomGenerator.alphabets(10)}`;
  const community =
    await api.functional.redditCommunity.member.communities.create(
      authorConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Voter subscribes to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Post author creates a text post
  const post = await api.functional.redditCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Voter casts a downvote on the post
  const downvote =
    await api.functional.redditCommunity.member.posts.vote.create(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: "DOWNVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "vote direction is DOWNVOTE",
    downvote.direction,
    "DOWNVOTE",
  );
  TestValidator.equals(
    "vote belongs to voter",
    downvote.member.id,
    voterAuth.id,
  );
  TestValidator.equals("vote targets correct post", downvote.post.id, post.id);
  // 7. Remove the downvote from the post (returns void on success)
  await api.functional.redditCommunity.member.posts.vote.erase(
    voterConnection,
    {
      postId: post.id,
    },
  );
  // 8. Verify voter can cast a new vote on the same post after removal
  // This proves the vote was successfully removed and user can vote again
  const newVote = await api.functional.redditCommunity.member.posts.vote.create(
    voterConnection,
    {
      postId: post.id,
      body: {
        direction: "UPVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(newVote);
  TestValidator.equals(
    "new vote direction is UPVOTE",
    newVote.direction,
    "UPVOTE",
  );
  TestValidator.equals(
    "new vote belongs to voter",
    newVote.member.id,
    voterAuth.id,
  );
  TestValidator.equals(
    "new vote targets correct post",
    newVote.post.id,
    post.id,
  );
  TestValidator.notEquals(
    "new vote has different ID than downvote",
    newVote.id,
    downvote.id,
  );
  TestValidator.predicate(
    "new vote created after downvote",
    new Date(newVote.created_at) >= new Date(downvote.created_at),
  );
}
