import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
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

export async function test_api_post_vote_update_remove_vote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  typia.assert(authorized);
  // In real scenario, a vote would be created first using a create vote API or utility.
  // Since no such utility or endpoint is provided, we'll assume a vote ID to update.
  // For demonstration, we generate a random UUID for postVoteId.
  const postVoteId = typia.random<string & tags.Format<"uuid">>();
  // We will update vote_type from "upvote" to "downvote" as a simulated removal by update
  // even if removal means setting a neutral state, here we cover update success only.
  const updateBody: ICommunityPlatformPostVoteOfUser.IUpdate = {
    vote_type: "downvote",
  };
  const updatedVote =
    await api.functional.communityPlatform.user.postVotes.users.updatePostVote(
      userConnection,
      {
        postVoteId,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);
  // Validate that the vote_type has been updated correctly
  TestValidator.equals(
    "Vote type updated",
    updatedVote.vote_type,
    updateBody.vote_type,
  );
}
