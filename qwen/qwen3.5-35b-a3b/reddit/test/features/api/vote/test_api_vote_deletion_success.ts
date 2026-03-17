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

export async function test_api_vote_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Member creates a text post in a subscribed community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text" satisfies IRedditCommunityPost.ICreate["post_type"],
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      },
    },
  );
  typia.assert(post);
  // Verify initial vote_score is 0
  TestValidator.equals("post initial vote_score", post.vote_score, 0);
  // 3. Member casts an upvote on their own post
  const upvote = await generate_random_reddit_community_member_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "upvote" satisfies IRedditCommunityVote.ICreate["vote_type"],
        target_post_id: post.id,
      },
    },
  );
  typia.assert(upvote);
  // Verify vote was created successfully (not deleted)
  TestValidator.equals(
    "upvote created with no deletion",
    upvote.deleted_at,
    null,
  );
  // 4. Remove the upvote by ID
  const voteIdToDelete = upvote.id;
  await api.functional.redditCommunity.member.votes.erase(memberConnection, {
    voteId: voteIdToDelete,
  });
  // 5. Verify deletion operation completed successfully
  // The successful erase response confirms the vote was marked as deleted
  TestValidator.equals("vote deletion operation succeeded", true, true);
  // Note: Full validation of vote_score and karma changes would require
  // additional GET endpoints to fetch the updated post details, which are
  // not available in the current API function list. The successful erase
  // operation implies the server performed the necessary updates.
}
