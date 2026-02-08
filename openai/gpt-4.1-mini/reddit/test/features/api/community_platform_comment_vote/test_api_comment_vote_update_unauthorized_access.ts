import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
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
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { generate_random_community_platform_user_comments_votes_create_comment_vote } from "../../../generate/generate_random_community_platform_user_comments_votes_create_comment_vote";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote_of_users } from "../../../prepare/prepare_random_community_platform_comment_vote_of_users";

export async function test_api_comment_vote_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that User B cannot update User A's comment vote due to authorization.
  // 1. Register User A and get authorized connection
  // 2. Register User B and get authorized connection
  // 3. User A creates a comment
  // 4. User A votes on the comment
  // 5. User B attempts to update User A's vote and expected to fail with authorization error
  // Step 1: User A join and authorized connection
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_user_join(userAConnection, { body: {} });
  typia.assert(userAAuth);
  userAConnection.headers = {
    Authorization: `Bearer ${userAAuth.token.access}`,
  };
  // Step 2: User B join and authorized connection
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_user_join(userBConnection, { body: {} });
  typia.assert(userBAuth);
  userBConnection.headers = {
    Authorization: `Bearer ${userBAuth.token.access}`,
  };
  // Step 3: User A creates a comment
  const commentRaw =
    await generate_random_community_platform_user_comments_create(
      userAConnection,
      { body: {} },
    );
  const comment = typia.assert<
    ICommunityPlatformComment & {
      id: string;
    }
  >(commentRaw);
  // Step 4: User A votes on the comment
  const commentVoteRaw =
    await generate_random_community_platform_user_comments_votes_create_comment_vote(
      userAConnection,
      {
        params: { commentId: comment.id },
        body: {},
      },
    );
  const commentVote = typia.assert<
    ICommunityPlatformCommentVoteOfUsers & {
      id: string;
    }
  >(commentVoteRaw);
  // Step 5: User B attempts to update User A's vote with empty update body
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
    async () => {
      await api.functional.communityPlatform.user.comments.votes.update(
        userBConnection,
        {
          commentId: comment.id,
          voteId: commentVote.id,
          body: {},
        },
      );
    },
  );
}
