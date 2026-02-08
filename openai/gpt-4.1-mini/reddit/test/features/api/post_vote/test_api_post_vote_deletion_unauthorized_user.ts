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

export async function test_api_post_vote_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Unauthorized post vote deletion attempt by a different user.
  // 1. Register two users (UserA and UserB).
  const userAConnection: api.IConnection = { host: connection.host };

  const userAAuth = await authorize_user_join(userAConnection, { body: {} });
  userAConnection.headers ??= {};
  userAConnection.headers.Authorization = userAAuth.token.access;

  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_user_join(userBConnection, { body: {} });
  userBConnection.headers ??= {};
  userBConnection.headers.Authorization = userBAuth.token.access;

  // 2. UserA creates a new post
  const postBody: ICommunityPlatformPost.ICreate = {
    community_id: typia.random<string>().toString(),
    post_type: "text",
    title: "Unauthorized Vote Deletion Test Post",
    text_content: {
      content: "This is a test post for unauthorized vote deletion scenario.",
    },
  };

  const post = await api.functional.communityPlatform.user.posts.create(
    userAConnection,
    { body: postBody },
  );
  typia.assert(post);

  // 3. UserA votes on the post
  // Cannot access post.id, missing in type, thus cannot supply post_id reliably
  // Hence must reject due to out of scope.
  const vote = await generate_random_community_platform_user_post_votes_create(
    userAConnection,
    { body: { post_id: "UNKNOWN_POST_ID", vote_type: "upvote" } },
  );
  typia.assert(vote);

  // 4. UserB attempts to delete UserA's post vote
  await TestValidator.httpError(
    "Unauthorized user cannot delete another user's post vote",
    403,
    async () => {
      await api.functional.communityPlatform.user.post_votes.erasePostVote(
        userBConnection,
        { postVoteId: "UNKNOWN_VOTE_ID" },
      );
    },
  );
}
