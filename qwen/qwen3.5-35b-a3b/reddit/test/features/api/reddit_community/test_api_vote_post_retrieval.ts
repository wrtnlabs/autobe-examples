import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_vote_post_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // 2. Create a post in a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: communityId,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 3. Cast an upvote on the created post
  const vote = await generate_random_reddit_community_member_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: post.id,
        target_comment_id: null,
      },
    },
  );
  typia.assert(vote);
  // 4. Retrieve the vote record using the vote ID
  const retrievedVote = await api.functional.redditCommunity.member.votes.at(
    memberConnection,
    {
      voteId: vote.id,
    },
  );
  typia.assert(retrievedVote);
  // 5. Validate the retrieved vote record
  TestValidator.equals(
    "vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "vote has targetPost",
    retrievedVote.targetPost !== null,
    true,
  );
  TestValidator.equals(
    "targetPost ID matches",
    retrievedVote.targetPost?.id,
    post.id,
  );
  TestValidator.equals(
    "targetPost title matches",
    retrievedVote.targetPost?.title,
    post.title,
  );
  TestValidator.equals(
    "targetPost author ID matches",
    retrievedVote.targetPost?.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "targetPost community ID matches",
    retrievedVote.targetPost?.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "vote member username matches",
    retrievedVote.member.username,
    post.author.username,
  );
  TestValidator.equals(
    "vote has created_at",
    retrievedVote.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "vote has updated_at",
    retrievedVote.updated_at !== undefined,
    true,
  );
  TestValidator.equals("vote not deleted", retrievedVote.deleted_at, null);
  TestValidator.equals(
    "vote targetComment is null",
    retrievedVote.targetComment,
    null,
  );
}