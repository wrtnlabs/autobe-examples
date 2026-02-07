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

export async function test_api_post_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register new member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create a post by the registered member
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text",
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Downvote the post
  const vote = await generate_random_community_member_votes_create(
    memberConnection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        vote_type: "downvote",
      } satisfies ICommunityPostVote.ICreate,
    },
  );
  // 4. Validate the downvote - verify it was created correctly
  typia.assert(vote);
  TestValidator.equals("vote type is downvote", vote.vote_type, "downvote");
  TestValidator.predicate("created_at is valid", () => {
    const date = new Date(vote.created_at);
    return !isNaN(date.getTime()) && date.toString() !== "Invalid Date";
  });
  TestValidator.predicate("updated_at is valid", () => {
    const date = new Date(vote.updated_at);
    return !isNaN(date.getTime()) && date.toString() !== "Invalid Date";
  });
  TestValidator.equals("deleted_at is null", vote.deleted_at, null);
}
