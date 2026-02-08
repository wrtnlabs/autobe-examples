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
import { generate_random_community_platform_user_comments_votes_update_vote } from "../../../generate/generate_random_community_platform_user_comments_votes_update_vote";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote_of_users } from "../../../prepare/prepare_random_community_platform_comment_vote_of_users";

export async function test_api_comment_vote_user_update_vote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is empty object
  });
  typia.assert(authorized);
  // Create a new connection for the authorized user with token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 2. Create a new comment
  const commentRaw =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      {
        body: {}, // Using defaults - rely on internal prepare_random for valid comment creation
      },
    );
  // Assert comment with id included for use
  const comment = typia.assert<
    ICommunityPlatformComment & {
      id: string;
    }
  >(commentRaw);
  // 3. Initially cast an upvote on the comment
  const initialVoteBody = {
    vote_type: "upvote", // Vote type 'upvote' (assumed to exist in request but no assertion on response)
  } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate;
  const initialVoteRaw =
    await generate_random_community_platform_user_comments_votes_update_vote(
      userConnection,
      {
        body: initialVoteBody,
        params: { commentId: comment.id },
      },
    );
  typia.assert<ICommunityPlatformCommentVoteOfUsers>(initialVoteRaw);
  // 4. Update the vote to 'downvote'
  const updatedVoteBody = {
    vote_type: "downvote",
  } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate;
  const updatedVoteRaw =
    await generate_random_community_platform_user_comments_votes_update_vote(
      userConnection,
      {
        body: updatedVoteBody,
        params: { commentId: comment.id },
      },
    );
  typia.assert<ICommunityPlatformCommentVoteOfUsers>(updatedVoteRaw);
}
