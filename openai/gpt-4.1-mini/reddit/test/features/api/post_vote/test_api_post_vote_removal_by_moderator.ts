import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_post_vote_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join (register) to get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  // Set token to moderatorConnection headers for auth
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorAuth.token.access;
  // 2. Moderator casts an upvote on a new randomly identified post (simulate)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const upvoteBody: ICommunityPlatformPostVote.IUpdate = {
    voteType: "upvote",
  };
  const upvoteResult =
    await api.functional.communityPlatform.moderator.posts.votes.updateVote(
      moderatorConnection,
      { postId, body: upvoteBody },
    );
  typia.assert(upvoteResult);
  const initialUpvotes = upvoteResult.upvotes;
  const initialDownvotes = upvoteResult.downvotes;
  // Vote removal: set voteType to null
  const removeVoteBody: ICommunityPlatformPostVote.IUpdate = {
    voteType: null,
  };
  // 3. Remove the moderator's vote
  const removalResult =
    await api.functional.communityPlatform.moderator.posts.votes.updateVote(
      moderatorConnection,
      { postId, body: removeVoteBody },
    );
  typia.assert(removalResult);
  TestValidator.predicate(
    "upvotes should decrease or stay zero after removal",
    removalResult.upvotes <= initialUpvotes && removalResult.upvotes >= 0,
  );
  TestValidator.predicate(
    "downvotes should not increase after removal",
    removalResult.downvotes <= initialDownvotes,
  );
  // 4. Authorization enforcement: test with no authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject vote removal without auth",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.posts.votes.updateVote(
        unauthorizedConnection,
        { postId, body: removeVoteBody },
      );
    },
  );
  // 5. Authorization enforcement: test with banned moderator
  // We simulate banning by creating a moderator but no direct banning API provided.
  // Instead, test invalid token scenario (simulate ban effect)
  const bannedModeratorConnection: api.IConnection = { host: connection.host };
  bannedModeratorConnection.headers = { Authorization: "InvalidOrBannedToken" };
  await TestValidator.httpError(
    "should reject vote removal by banned moderator",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.posts.votes.updateVote(
        bannedModeratorConnection,
        { postId, body: removeVoteBody },
      );
    },
  );
}
