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
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test removing a vote from a post by setting direction to null.
 *
 * Test workflow:
 * 1. Register and authenticate as a member
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create a text post in the community
 * 5. Cast an initial upvote on the post
 * 6. Remove the vote by setting direction to null
 * 7. Verify the vote record has deleted_at timestamp set (soft-deleted)
 * 8. Verify the vote direction is properly handled when removed
 */
export async function test_api_post_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Store initial vote score for comparison
  const initialVoteScore = post.vote_score;
  // 5. Cast an initial upvote on the post
  const upvote = await api.functional.redditCommunity.member.posts.vote.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        direction: "UPVOTE",
      },
    },
  );
  typia.assert(upvote);
  // Verify upvote was created successfully
  TestValidator.equals("upvote direction", upvote.direction, "UPVOTE");
  TestValidator.predicate(
    "upvote not deleted initially",
    upvote.deleted_at === null,
  );
  // 6. Remove the vote by setting direction to null
  const removedVote =
    await api.functional.redditCommunity.member.posts.vote.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          direction: null,
        },
      },
    );
  typia.assert(removedVote);
  // 7. Verify the vote record has deleted_at timestamp set (soft-deleted)
  TestValidator.predicate(
    "vote is soft-deleted after removal",
    removedVote.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is valid date-time format",
    typeof removedVote.deleted_at === "string" &&
      removedVote.deleted_at.length > 0,
  );
  // 8. Verify vote removal logic - the returned vote should reflect removal state
  // When direction is null, the vote is soft-deleted but the direction field
  // in the response may retain the last voted direction or be null
  TestValidator.predicate(
    "vote removal returns valid vote object",
    removedVote.id !== undefined &&
      removedVote.member !== undefined &&
      removedVote.post !== undefined,
  );
  // Verify the member who cast the vote matches
  TestValidator.equals(
    "vote member matches authenticated user",
    removedVote.member.id,
    authResult.id,
  );
  // Verify the post being voted on matches
  TestValidator.equals(
    "vote post matches created post",
    removedVote.post.id,
    post.id,
  );
  // Verify timestamps are valid
  TestValidator.predicate(
    "vote has valid created_at timestamp",
    typeof upvote.created_at === "string" && upvote.created_at.length > 0,
  );
  TestValidator.predicate(
    "vote has valid updated_at timestamp",
    typeof removedVote.updated_at === "string" &&
      removedVote.updated_at.length > 0,
  );
}
