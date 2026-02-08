import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

export async function test_api_post_vote_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new user and obtain authorized connection
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorizedUser);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // Step 2: Create a new post by the user
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  );
  // Although ICommunityPlatformPost is empty, assert it has id property
  const safePost = post as ICommunityPlatformPost & {
    id: string & typia.tags.Format<"uuid">;
  };
  // Step 3: Create a vote on the post by the same user
  const vote = await generate_random_community_platform_user_post_votes_create(
    userConnection,
    {
      body: { post_id: safePost.id } satisfies {
        post_id: string & typia.tags.Format<"uuid">;
      },
    },
  );
  // Similarly, assert vote has id property
  const safeVote = vote as ICommunityPlatformPostVote & {
    id: string & typia.tags.Format<"uuid">;
  };
  // Step 4: Delete the created vote by its ID
  await api.functional.communityPlatform.user.post_votes.erasePostVote(
    userConnection,
    {
      postVoteId: safeVote.id,
    },
  );
  // Step 5: Confirm deletion by attempting deletion again (expect 404)
  await TestValidator.httpError(
    "deleting non-existent post vote should return 404",
    404,
    async () =>
      await api.functional.communityPlatform.user.post_votes.erasePostVote(
        userConnection,
        {
          postVoteId: safeVote.id,
        },
      ),
  );
}
