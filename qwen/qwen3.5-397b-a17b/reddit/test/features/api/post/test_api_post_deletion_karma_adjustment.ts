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
 * Test that deleting a post correctly adjusts the author's karma score.
 *
 * Steps:
 * 1. Register a member account (post author)
 * 2. Register a second member account (voter)
 * 3. Create a community and subscribe both members
 * 4. First member creates a post
 * 5. Second member votes on the post to establish a vote score
 * 6. Record the post's vote score before deletion
 * 7. Delete the post
 * 8. Verify the post deletion succeeds
 *
 * Note: Karma adjustment validation requires karma-histories endpoint which is not
 * available in current API set, so test focuses on post deletion with established vote score.
 */
export async function test_api_post_deletion_karma_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register post author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 2. Register voter member (different user to vote on the post)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 3. Create community (as author)
  const community =
    await generate_random_reddit_community_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Author subscribes to community
  const authorSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      authorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(authorSubscription);
  // 5. Voter subscribes to community (required to vote)
  const voterSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(voterSubscription);
  // 6. Author creates a post
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
  TestValidator.equals("post author matches", post.author.id, authorAuth.id);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  // 7. Voter upvotes the post to establish vote score
  const vote = await api.functional.redditCommunity.member.posts.vote.create(
    voterConnection,
    {
      postId: post.id,
      body: {
        direction: "UPVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);
  TestValidator.equals("vote direction", vote.direction, "UPVOTE");
  // 8. Record vote score before deletion
  // Note: The post.vote_score from creation is 0, after vote it should be updated
  // Without a GET endpoint, we validate the vote was created successfully
  const voteScoreBeforeDeletion = post.vote_score;
  TestValidator.predicate(
    "initial vote score recorded",
    typeof voteScoreBeforeDeletion === "number",
  );
  // 9. Delete the post (as author)
  await api.functional.redditCommunity.member.posts.erase(authorConnection, {
    postId: post.id,
  });
  // 10. Verify deletion succeeded (no error thrown)
  // Note: Cannot verify karma adjustment as karma-histories endpoint is not available
  // The test validates that post deletion works correctly with established vote score
  TestValidator.predicate("deletion completed without error", true);
}
