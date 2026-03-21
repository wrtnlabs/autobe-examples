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
 * Test retrieving a specific vote that the authenticated member cast on a post.
 * This validates the vote direction is correctly stored and retrieved.
 *
 * Steps:
 * 1. Authenticate as a new member
 * 2. Create a community and post
 * 3. Cast a vote on the post
 * 4. Retrieve the vote using the returned voteId
 * 5. Validate response contains:
 *    - Direction is correctly stored
 *    - All timestamps present
 *    - Member info matches authenticated user
 */
export async function test_api_post_vote_retrieval_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMemberSession.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Create a community for the post
  const community: IRedditCloneCommunityBan =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create a post in the community
  const post: IRedditClonePostLink =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    });
  // 4. Cast a vote on the post (API creates upvote by default)
  const vote: IRedditClonePostImage =
    await api.functional.redditClone.member.posts.votes.create(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(vote);
  // 5. Retrieve the vote using the returned voteId
  const retrievedVote: IRedditClonePostImage =
    await api.functional.redditClone.posts.votes.at(memberConnection, {
      postId: post.id,
      voteId: vote.id,
    });
  typia.assert(retrievedVote);
  // 6. Validate retrieved vote matches the created vote
  TestValidator.equals("vote ID matches", retrievedVote.id, vote.id);
  TestValidator.equals(
    "vote direction preserved",
    retrievedVote.direction,
    vote.direction,
  );
  TestValidator.equals(
    "member ID matches authenticated user",
    retrievedVote.member.id,
    authorized.id,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    () =>
      retrievedVote.created_at !== undefined &&
      retrievedVote.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () =>
      retrievedVote.updated_at !== undefined &&
      retrievedVote.updated_at.length > 0,
  );
}
