import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUser";
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

export async function test_api_comment_vote_user_retrieve_by_id_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Create a comment vote for test
  const createdVoteRaw =
    await generate_random_community_platform_comment_votes_create(
      userConnection,
      {
        body: {},
      },
    );
  const createdVote = typia.assert<ICommunityPlatformCommentVoteOfUser>(createdVoteRaw);
  // 3. Retrieve the comment vote by ID
  const retrievedVoteRaw =
    await api.functional.communityPlatform.user.commentVotes.users.at(
      userConnection,
      {
        commentVoteId: createdVote.id,
      },
    );
  const retrievedVote = typia.assert<ICommunityPlatformCommentVoteOfUser>(retrievedVoteRaw);
  // 4. Validate the retrieved data
  TestValidator.equals("commentVote ID", retrievedVote.id, createdVote.id);
  TestValidator.equals(
    "commentVote voteType",
    retrievedVote.voteType,
    createdVote.voteType,
  );
  TestValidator.equals(
    "commentVote communityPlatformCommentId",
    retrievedVote.communityPlatformCommentId,
    createdVote.communityPlatformCommentId,
  );
  TestValidator.equals(
    "commentVote communityPlatformUserId",
    retrievedVote.communityPlatformUserId,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "commentVote voteType is valid",
    retrievedVote.voteType === "upvote" ||
      retrievedVote.voteType === "downvote",
  );
  // Validate timestamps format
  TestValidator.predicate(
    "commentVote createdAt is ISO string",
    typeof retrievedVote.createdAt === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
        retrievedVote.createdAt,
      ),
  );
  TestValidator.predicate(
    "commentVote updatedAt is ISO string",
    typeof retrievedVote.updatedAt === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
        retrievedVote.updatedAt,
      ),
  );
  TestValidator.predicate(
    "commentVote deletedAt is null or ISO string",
    retrievedVote.deletedAt === null ||
      (typeof retrievedVote.deletedAt === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
          retrievedVote.deletedAt,
        )),
  );
}
