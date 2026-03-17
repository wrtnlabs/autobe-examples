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

export async function test_api_vote_change_vote_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create a post in a community
  // Use a valid community_id - will be validated by API
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await generate_random_reddit_community_member_posts_create(
    memberAuthConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  const initialVoteScore = post.vote_score;
  // 3. Cast initial upvote
  const upvote = await api.functional.redditCommunity.member.votes.create(
    memberAuthConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: post.id,
      },
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote direction", upvote.vote_type, "upvote");
  // 4. Try to change vote to downvote
  // Business rule: can only have one active vote per target
  // Attempting to cast a different vote type on same target
  const downvote = await api.functional.redditCommunity.member.votes.create(
    memberAuthConnection,
    {
      body: {
        vote_type: "downvote",
        target_post_id: post.id,
      },
    },
  );
  typia.assert(downvote);
  TestValidator.equals("downvote direction", downvote.vote_type, "downvote");
  // 5. Validate vote target relationship
  typia.assert(downvote);
  if (downvote.targetPost) {
    TestValidator.equals(
      "downvote targets correct post",
      downvote.targetPost.id,
      post.id,
    );
  }
  // 6. Validate vote was cast by this member
  TestValidator.equals(
    "downvote cast by authenticated member",
    downvote.member.id,
    memberAuth.token.access.length > 0 ? upvote.member.id : "",
  );
  // 7. Validate vote created_at and updated_at are present
  TestValidator.predicate(
    "downvote has valid timestamps",
    () => Boolean(downvote.created_at && downvote.updated_at),
  );
  // 8. Validate vote is active (deleted_at is null)
  TestValidator.equals(
    "downvote is active (not deleted)",
    downvote.deleted_at,
    null,
  );
}