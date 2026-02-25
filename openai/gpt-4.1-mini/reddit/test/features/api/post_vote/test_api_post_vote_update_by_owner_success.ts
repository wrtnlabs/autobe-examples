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

/**
 * Test scenario for a user successfully updating their post vote.
 * Steps:
 * 1. User registers (join) and is authenticated
 * 2. Create a vote (using update to create an initial vote on a random postVoteId)
 * 3. Update the vote to a different vote_type ('upvote' or 'downvote')
 * 4. Validate response correctness and ownership
 * 5. Validate timestamps
 */
export async function test_api_post_vote_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User joins and is authenticated
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd12345",
      username: `user_${Date.now()}`,
      displayName: `User ${Date.now()}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Set authenticated connection header
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // Step 2: Create an initial vote by updating (simulate creation)
  const postVoteId = typia.random<string & tags.Format<"uuid">>();
  const initialVoteBody: ICommunityPlatformPostVoteOfUser.IUpdate = {
    vote_type: "upvote",
  };
  const createdVote =
    await api.functional.communityPlatform.user.postVotes.users.updatePostVote(
      userConnection,
      { postVoteId, body: initialVoteBody },
    );
  typia.assert(createdVote);
  // Step 3: Update the vote to downvote
  const updatedVoteBody: ICommunityPlatformPostVoteOfUser.IUpdate = {
    vote_type: "downvote",
  };
  const updatedVote =
    await api.functional.communityPlatform.user.postVotes.users.updatePostVote(
      userConnection,
      { postVoteId, body: updatedVoteBody },
    );
  typia.assert(updatedVote);
  // Step 4: Validate updated vote correctness
  TestValidator.equals(
    "vote_type matches updated",
    updatedVote.vote_type,
    updatedVoteBody.vote_type,
  );
  TestValidator.equals("user id matches owner", updatedVote.user.id, user.id);
  // Step 5: Validate timestamp update
  TestValidator.predicate(
    "updated_at newer than created_at",
    new Date(updatedVote.updated_at).getTime() >
      new Date(updatedVote.created_at).getTime(),
  );
}
