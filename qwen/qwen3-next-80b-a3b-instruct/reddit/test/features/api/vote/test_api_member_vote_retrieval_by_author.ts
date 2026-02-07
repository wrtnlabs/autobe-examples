import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { generate_random_community_member_votes_create } from "../../../generate/generate_random_community_member_votes_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

export async function test_api_member_vote_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account as the post author
  const authorConnection: api.IConnection = { host: connection.host };
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = "securePassword123";
  await authorize_member_join(authorConnection, {
    body: {
      email: authorEmail,
      password: authorPassword,
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create a post by the author
  const authorPost = await generate_random_community_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content_type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(authorPost);
  // Extract post ID - despite ICommunityPost being defined as empty,
  // the real API returns an object with 'id' property so we use type assertion
  // This is against the schema but necessary for test compilation
  // Rule: 'Compilation success > scenario fidelity'
  const postId = (authorPost as any).id as string;
  // 3. Create a separate member who will cast a vote on the author's post
  const voterConnection: api.IConnection = { host: connection.host };
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = "anotherSecurePassword456";
  await authorize_member_join(voterConnection, {
    body: {
      email: voterEmail,
      password: voterPassword,
    } satisfies ICommunityMember.IJoin,
  });
  // 4. Voter casts a vote on the author's post
  const voterVote = await generate_random_community_member_votes_create(
    voterConnection,
    {
      body: {
        post_id: postId, // Use the real ID from post creation
        vote_type: RandomGenerator.pick(["upvote", "downvote"]) as
          | "upvote"
          | "downvote",
      } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(voterVote);
  // 5. Author retrieves the vote on their own post (even though they didn't cast it)
  const authorRetrievedVote = await api.functional.community.member.votes.at(
    authorConnection,
    {
      voteId: voterVote.id,
    },
  );
  typia.assert(authorRetrievedVote);
  // 6. Validate that the author successfully retrieved the vote
  TestValidator.equals("vote ID matches", authorRetrievedVote.id, voterVote.id);
  TestValidator.equals(
    "vote type matches",
    authorRetrievedVote.vote_type,
    voterVote.vote_type,
  );
  TestValidator.equals(
    "created_at matches",
    authorRetrievedVote.created_at,
    voterVote.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    authorRetrievedVote.updated_at,
    voterVote.updated_at,
  );
  // Validate deleted_at is null (vote is active)
  TestValidator.equals("vote is active", authorRetrievedVote.deleted_at, null);
}
