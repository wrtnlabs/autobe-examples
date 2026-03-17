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

export async function test_api_vote_retrieval_with_karma(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Step 2: Authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Step 3: Member A creates a post (requires community_id - using a generated one for test)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const memberAPost = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: communityId,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(memberAPost);
  // Step 4: Member B votes on Member A's post
  const memberBVote = await api.functional.redditCommunity.member.votes.create(
    memberBConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: memberAPost.id,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(memberBVote);
  // Step 5: Retrieve the vote record using vote ID
  const retrievedVote = await api.functional.redditCommunity.member.votes.at(
    memberBConnection,
    {
      voteId: memberBVote.id,
    },
  );
  typia.assert(retrievedVote);
  // Step 6: Validate vote record contains correct target post
  TestValidator.equals(
    "vote target post ID matches",
    retrievedVote.targetPost?.id,
    memberAPost.id,
  );
  // Step 7: Validate vote type is upvote
  TestValidator.equals(
    "vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );
  // Step 8: Validate voting member has username
  TestValidator.predicate(
    "voting member has username",
    retrievedVote.member.username.length > 0,
  );
  // Step 9: Validate vote record has proper timestamps
  TestValidator.predicate(
    "vote created_at is valid date-time",
    () => !isNaN(Date.parse(retrievedVote.created_at)),
  );
  TestValidator.predicate(
    "vote updated_at is valid date-time",
    () => !isNaN(Date.parse(retrievedVote.updated_at)),
  );
  // Step 10: Validate vote was not deleted
  TestValidator.equals(
    "vote is active (not deleted)",
    retrievedVote.deleted_at,
    null,
  );
  // Step 11: Validate vote has target post summary (not null)
  TestValidator.predicate(
    "vote has target post",
    retrievedVote.targetPost !== null && retrievedVote.targetPost !== undefined,
  );
  // Step 12: Validate target post author is Member A
  TestValidator.equals(
    "target post author is Member A",
    retrievedVote.targetPost!.author.id,
    memberAPost.author.id,
  );
  // Step 13: Validate karma impact - Member B's vote member summary exists
  TestValidator.predicate(
    "voting member karma can be retrieved",
    () => retrievedVote.member.karma !== undefined,
  );
  // Step 14: Validate vote record structure - created_at and updated_at are present
  TestValidator.predicate(
    "vote has required timestamps",
    () =>
      retrievedVote.created_at !== undefined &&
      retrievedVote.updated_at !== undefined,
  );
}
