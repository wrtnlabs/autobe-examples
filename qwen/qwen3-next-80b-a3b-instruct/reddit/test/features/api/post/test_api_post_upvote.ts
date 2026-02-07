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

export async function test_api_post_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies ICommunityMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: memberJoin,
  });
  typia.assert(authorized);
  // 2. Create a post
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers;
  const postResponse = await generate_random_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(postResponse);
  // 3. Upvote the post
  const voteConnection: api.IConnection = { host: connection.host };
  voteConnection.headers = memberConnection.headers;
  const vote = await generate_random_community_member_votes_create(
    voteConnection,
    {
      body: {
        vote_type: "upvote" as const,
      } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 4. Validate vote record
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.predicate(
    "created_at is valid",
    new Date(vote.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(vote.updated_at) instanceof Date,
  );
  TestValidator.equals(
    "created_at equals updated_at (first vote)",
    vote.created_at,
    vote.updated_at,
  );
  TestValidator.equals("deleted_at is null", vote.deleted_at, null);
  // Validate the vote's own id since it exists on ICommunityPostVote
  TestValidator.predicate(
    "vote id is a UUID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      vote.id,
    ),
  );
  // Validate that the post property exists (even though empty)
  TestValidator.predicate(
    "post is an object",
    vote.post !== null && typeof vote.post === "object",
  );
}
