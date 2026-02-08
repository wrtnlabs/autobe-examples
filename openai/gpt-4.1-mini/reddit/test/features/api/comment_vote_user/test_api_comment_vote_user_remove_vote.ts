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

export async function test_api_comment_vote_user_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join
  const userConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_user_join(userConnection, { body: {} });
  typia.assert(joinOutput);
  // Attach token to userConnection
  userConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  // 2. Create a new comment
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {}, // No overrides, random valid comment
    },
  );
  typia.assert(comment);
  // 3. User votes upvote on comment
  const voteUp =
    await generate_random_community_platform_user_comments_votes_update_vote(
      userConnection,
      {
        params: { commentId: (comment as any).id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate,
      },
    );
  typia.assert(voteUp);
  // 4. User removes their vote by sending vote_type as null
  const voteRemove =
    await generate_random_community_platform_user_comments_votes_update_vote(
      userConnection,
      {
        params: { commentId: (comment as any).id },
        body: {
          vote_type: null,
        } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate,
      },
    );
  typia.assert(voteRemove);
  // Validation: After removal, vote_type should reflect removal - vote entity likely resets or partially null
  if ("vote_type" in voteRemove) {
    TestValidator.equals("vote_type after removal", voteRemove.vote_type, null);
  }
}
