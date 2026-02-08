import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function test_api_comment_vote_user_access_control_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Validate access control when fetching a comment vote by user
  // 1. Create two users: user1 and user2
  const user1Connection: api.IConnection = { host: connection.host };
  const user2Connection: api.IConnection = { host: connection.host };
  const user1Authorized = await authorize_user_join(user1Connection, {
    body: {},
  });
  user1Connection.headers = {
    Authorization: `Bearer ${user1Authorized.token.access}`,
  };
  const user2Authorized = await authorize_user_join(user2Connection, {
    body: {},
  });
  user2Connection.headers = {
    Authorization: `Bearer ${user2Authorized.token.access}`,
  };
  // 2. User1 creates a comment
  const commentRaw = await generate_random_community_platform_user_comments_create(
    user1Connection,
    { body: {} },
  );
  const comment = typia.assert<ICommunityPlatformComment & { id: string }>(commentRaw);
  // 3. User1 creates a vote on the comment
  const commentVoteRaw =
    await generate_random_community_platform_user_comments_votes_create_comment_vote(
      user1Connection,
      {
        params: { commentId: comment.id },
        body: {},
      },
    );
  const commentVote = typia.assert<ICommunityPlatformCommentVoteOfUsers & { id: string }>(commentVoteRaw);
  // 4. Attempt to fetch the comment vote without authentication (base connection, no headers)
  await TestValidator.httpError(
    "unauthenticated request should be denied",
    401,
    async () => {
      await api.functional.communityPlatform.user.comment_votes.users.at(
        connection,
        {
          commentVoteId: commentVote.id,
        },
      );
    },
  );
  // 5. Attempt to fetch the comment vote as user2 who does NOT own the vote; expect forbidden (403)
  await TestValidator.httpError(
    "user cannot fetch another user's comment vote",
    403,
    async () => {
      await api.functional.communityPlatform.user.comment_votes.users.at(
        user2Connection,
        {
          commentVoteId: commentVote.id,
        },
      );
    },
  );
  // 6. Fetch the comment vote as user1 (owner); expect successful retrieval
  const fetchedVoteRaw =
    await api.functional.communityPlatform.user.comment_votes.users.at(
      user1Connection,
      {
        commentVoteId: commentVote.id,
      },
    );
  const fetchedVote = typia.assert<ICommunityPlatformCommentVoteOfUsers & { id: string }>(fetchedVoteRaw);
  // 7. Validate that the fetched vote's ID matches created vote's ID
  TestValidator.equals(
    "fetched vote ID should match created vote ID",
    fetchedVote.id,
    commentVote.id,
  );
}
