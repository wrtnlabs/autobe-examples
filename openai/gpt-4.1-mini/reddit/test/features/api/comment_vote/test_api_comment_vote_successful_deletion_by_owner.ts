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

export async function test_api_comment_vote_successful_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // Authorization header set inside authorize_user_join
  // 2. Create a comment vote by the authenticated user
  const commentVote =
    await generate_random_community_platform_comment_votes_create(
      userConnection,
      {},
    );
  // Assert that commentVote has 'commentVoteId' property for deletion
  typia.assert(commentVote as ICommunityPlatformCommentVote & { commentVoteId: string });
  const commentVoteId: string = (commentVote as any).commentVoteId;
  // 3. Delete the comment vote using the authenticated user's connection
  await api.functional.communityPlatform.commentVotes.erase(userConnection, {
    commentVoteId: commentVoteId,
  });
  // 4. Attempt to delete again to confirm deletion returns error
  await TestValidator.httpError(
    "deleting already deleted comment vote",
    404,
    async () => {
      await api.functional.communityPlatform.commentVotes.erase(
        userConnection,
        {
          commentVoteId: commentVoteId,
        },
      );
    },
  );
}
