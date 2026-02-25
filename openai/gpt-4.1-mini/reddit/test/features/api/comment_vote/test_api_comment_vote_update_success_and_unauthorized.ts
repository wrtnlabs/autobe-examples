import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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
import { generate_random_community_platform_comment_votes_create } from "../../../generate/generate_random_community_platform_comment_votes_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";

export async function test_api_comment_vote_update_success_and_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successfully update existing comment vote upvote<->downvote and check correctness and auth error when unauthorized
  // 1. Authorize user join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userJoinConnection, {});
  typia.assert(authorizedUser);
  // Create user-specific connection with token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create initial comment vote as upvote
  const initialVote =
    await generate_random_community_platform_comment_votes_create(
      userConnection,
      {
        body: { voteType: "upvote" },
      },
    );
  typia.assert(initialVote);
  // Extract id from the initialVote, casting to any as id is not part of the type
  const commentVoteId: string = (initialVote as any).id;
  // 3. Update vote from upvote -> downvote
  const updatedVoteDown =
    await api.functional.communityPlatform.commentVotes.update(userConnection, {
      commentVoteId: commentVoteId,
      body: { vote_type: "downvote" },
    });
  typia.assert(updatedVoteDown);
  TestValidator.equals(
    "vote_type updated to downvote",
    updatedVoteDown.downvoteCount > 0,
    true,
  );
  // 4. Update vote from downvote -> upvote
  const updatedVoteUp =
    await api.functional.communityPlatform.commentVotes.update(userConnection, {
      commentVoteId: commentVoteId,
      body: { vote_type: "upvote" },
    });
  typia.assert(updatedVoteUp);
  TestValidator.equals(
    "vote_type updated to upvote",
    updatedVoteUp.upvoteCount > 0,
    true,
  );
  // 5. Unauthorized update attempt with new connection (no auth header)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "forbidden error on unauthorized update",
    403,
    async () => {
      await api.functional.communityPlatform.commentVotes.update(
        unauthorizedConnection,
        {
          commentVoteId: commentVoteId,
          body: { vote_type: "downvote" },
        },
      );
    },
  );
}
