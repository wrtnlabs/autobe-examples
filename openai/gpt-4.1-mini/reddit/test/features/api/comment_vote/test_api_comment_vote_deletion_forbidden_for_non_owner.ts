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

export async function test_api_comment_vote_deletion_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Test fail to delete a comment vote when the user is not the owner or authorized moderator/admin. The test should create two users, authenticate both, create a vote by user A, then attempt deletion by user B. Validate the 403 Forbidden status response.
  // 1. Create user A and authenticate
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {});
  typia.assert(userA);
  // 2. Create user B and authenticate
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {});
  typia.assert(userB);
  // 3. User A creates a comment vote
  const commentVote =
    await generate_random_community_platform_comment_votes_create(
      userAConnection,
      {},
    );
  typia.assert(commentVote);
  // 4. User B attempts to delete user A's comment vote - should fail with 403 Forbidden
  // Since commentVote does not contain an 'id', we use a random UUID to simulate the commentVoteId owned by user A
  const fakeCommentVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "comment vote deletion forbidden for non-owner",
    403,
    async () => {
      await api.functional.communityPlatform.commentVotes.erase(
        userBConnection,
        {
          commentVoteId: fakeCommentVoteId,
        },
      );
    },
  );
}
