import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_post_votes_create } from "../../../generate/generate_random_community_platform_user_post_votes_create";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_create_upvote_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to create a post vote (upvote) without any authentication.
  // We expect the request to be rejected with an HTTP 401 Unauthorized error.
  // Since no user join or login is performed, we use the base connection directly.
  // We prepare a dummy body with a fixed valid UUID for a post_id and const vote_type "upvote".
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Construct a dummy post_vote creation body
  // post_id must be a valid UUID. We'll use a fixed example UUID for testing.
  const postVoteCreateBody: ICommunityPlatformPostVote.ICreate = {
    post_id: "00000000-0000-0000-0000-000000000001",
    vote_type: "upvote",
  };
  // Attempt to create a post vote without authorization
  await TestValidator.httpError(
    "creating post vote without authentication returns 401",
    401,
    async () => {
      await api.functional.communityPlatform.user.post_votes.create(
        unauthorizedConnection,
        { body: postVoteCreateBody },
      );
    },
  );
}
