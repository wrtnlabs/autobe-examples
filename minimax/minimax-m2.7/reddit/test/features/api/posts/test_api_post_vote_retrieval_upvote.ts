import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

/**
 * Test retrieving a specific upvote cast on a post.
 *
 * This test validates the primary success path for vote retrieval.
 * 1. Authenticate as a new member using join endpoint
 * 2. Create a community for posting
 * 3. Create a post in that community
 * 4. Cast an upvote on the post
 * 5. Retrieve the vote using the returned voteId
 * 6. Validate response contains correct vote data
 */
export async function test_api_post_vote_retrieval_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community for posting
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in that community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Cast an upvote on the post
  const vote = await api.functional.redditClone.member.posts.votes.create(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // 5. Retrieve the vote using the returned voteId
  const retrievedVote = await api.functional.redditClone.posts.votes.at(
    memberConnection,
    {
      postId: post.id,
      voteId: vote.id,
    },
  );
  typia.assert(retrievedVote);
  // 6. Validate response
  TestValidator.equals("vote id matches", retrievedVote.id, vote.id);
  TestValidator.equals(
    "direction is upvote",
    retrievedVote.direction,
    "upvote",
  );
  TestValidator.predicate(
    "has created_at timestamp",
    !!retrievedVote.created_at,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    !!retrievedVote.updated_at,
  );
  TestValidator.equals(
    "member id matches authenticated user",
    retrievedVote.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member username matches",
    retrievedVote.member.username,
    authorized.username,
  );
}
