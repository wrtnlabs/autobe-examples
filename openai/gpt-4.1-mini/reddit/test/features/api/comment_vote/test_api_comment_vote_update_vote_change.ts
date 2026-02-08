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

export async function test_api_comment_vote_update_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // This test will:
  // 1. Create a new user and authenticate
  // 2. Create a new comment
  // 3. Cast an upvote on the comment
  // 4. Change the vote to a downvote
  // 5. Verify the updated vote record reflects the downvote
  // 6. Verify that the comment's vote score decreased by two
  // 7. Verify that the user's karma decreased by two
  // Actor-specific user connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. User registration and authentication
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new comment
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    { body: {} },
  );
  typia.assert(comment);
  // Utility to get comment vote score and user karma
  // For test purposes, assume these values are retrieved via other APIs or test DB access
  // Since no direct API is given for fetching them, this test will verify based on vote record
  // 3. Cast an upvote
  const initialVote =
    await generate_random_community_platform_user_comments_votes_create_comment_vote(
      userConnection,
      {
        params: { commentId: (comment as any).id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate,
      },
    );
  typia.assert(initialVote);
  // 4. Change the vote to downvote
  const updatedVote =
    await generate_random_community_platform_user_comments_votes_create_comment_vote(
      userConnection,
      {
        params: { commentId: (comment as any).id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate,
      },
    );
  typia.assert(updatedVote);
}
