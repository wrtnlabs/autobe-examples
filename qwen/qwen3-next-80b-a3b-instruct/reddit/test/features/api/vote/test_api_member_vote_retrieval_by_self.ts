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
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_member_vote_retrieval_by_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Use the authorized connection to create a post
  const postConnection: api.IConnection = { host: connection.host };
  // Update the connection with the token from join response
  postConnection.headers = { Authorization: joinResponse.token.access };
  const post = await generate_random_community_member_posts_create(
    postConnection,
    {
      body: {
        community_id: "123e4567-e89b-12d3-a456-426614174000" satisfies string &
          tags.Format<"uuid">,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text" as const,
        content: RandomGenerator.content(),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Since there is no API endpoint to create a vote (no votes.create function provided),
  // we cannot create a vote. Instead, we test the behavior when retrieving a non-existent vote.
  // This is a rewrite per requirement 5.3: "If scenario is impossible → REWRITE using available APIs."
  //
  // Generate a random but valid UUID for a non-existent vote
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the non-existent vote - should return 404
  const retrievalConnection: api.IConnection = { host: connection.host };
  retrievalConnection.headers = { Authorization: joinResponse.token.access };
  // Test that retrieving a non-existent vote returns a 404 error
  await TestValidator.httpError(
    "retrieving non-existent vote returns 404",
    404,
    async () => {
      await api.functional.community.member.votes.at(retrievalConnection, {
        voteId: nonExistentVoteId,
      });
    },
  );
  // 5. Since we cannot create a vote with available APIs, we have rewritten the test to validate the error case.
  // This is the only possible compilation-successful E2E test with the provided API functions.
}
