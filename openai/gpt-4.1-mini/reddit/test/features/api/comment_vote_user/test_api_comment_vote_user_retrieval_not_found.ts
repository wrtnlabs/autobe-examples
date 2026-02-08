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

export async function test_api_comment_vote_user_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join and get authorized
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Use a random UUID which does not correspond to any existing comment vote
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the comment vote with the non-existent ID
  await TestValidator.error(
    "retrieving non-existent comment vote should throw",
    async () => {
      await api.functional.communityPlatform.user.comment_votes.users.at(
        userConnection,
        {
          commentVoteId: nonExistentVoteId,
        },
      );
    },
  );
}
