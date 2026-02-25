import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_comment_votes_create } from "../../../generate/generate_random_community_platform_comment_votes_create";
import { generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote } from "../../../generate/generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_comment_vote_of_moderator } from "../../../prepare/prepare_random_community_platform_comment_vote_of_moderator";

export async function test_api_moderator_comment_vote_create_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a comment vote entity with no authorization needed (simulate user action assumed)
  const userConnection: api.IConnection = { host: connection.host };
  const commentVote = await generate_random_community_platform_comment_votes_create(
    userConnection,
    {},
  );
  typia.assert(commentVote);
  // 2. Use base connection with no authorization header to call moderator comment vote create
  // Expect HTTP 401 or 403 error (unauthorized or forbidden)
  await TestValidator.httpError(
    "attempt to create moderator comment vote without auth",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.commentVotes.moderators.createModeratorCommentVote(
        connection,
        {
          body: {
            commentVoteId: (commentVote as any).id ?? (commentVote as any).comment_vote_id ?? typia.assert<string>((commentVote as any).id ?? (commentVote as any).comment_vote_id),
            vote: 1,
          } satisfies ICommunityPlatformCommentVoteOfModerator.ICreate,
        },
      );
    },
  );
}
