import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function test_api_comment_vote_update_by_owner_successful_change(
  connection: api.IConnection,
) {
  // 1. Create and authorize a new user
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {});
  typia.assert(userJoin);
  userConnection.headers = { Authorization: userJoin.token.access };
  // 2. We simulate creating a user's previous comment vote entry by generating random data
  // Note: We need a commentVoteId and its initial voteType to test update functionality
  // Since we have no creation endpoint in the scenario, we mock these with random UUIDs and valid voteTypes
  // We'll pick 'upvote' and 'downvote' as valid types
  const commentVoteId = typia.random<string & tags.Format<"uuid">>();
  let currentVoteType = "upvote";
  // 3. Update the user's vote from upvote to downvote
  const updateBody1 = {
    vote_type: "downvote",
  } satisfies ICommunityPlatformCommentVoteOfUser.IUpdate;
  const updatedVote1 =
    await api.functional.communityPlatform.user.commentVotes.users.updateCommentVoteByUser(
      userConnection,
      {
        commentVoteId,
        body: updateBody1,
      },
    );
  typia.assert(updatedVote1);
  // 4. Validate returned vote has expected new voteType
  TestValidator.equals(
    "vote_type changed to downvote",
    updatedVote1.voteType,
    "downvote",
  );
  TestValidator.equals("commentVoteId is same", updatedVote1.id, commentVoteId);
  TestValidator.predicate(
    "updatedAt is newer or equal",
    updatedVote1.updatedAt >= updatedVote1.createdAt,
  );
  TestValidator.predicate(
    "deletedAt is null or undefined",
    updatedVote1.deletedAt === null || updatedVote1.deletedAt === undefined,
  );
  // 5. Update the user's vote from downvote back to upvote
  const updateBody2 = {
    vote_type: "upvote",
  } satisfies ICommunityPlatformCommentVoteOfUser.IUpdate;
  const updatedVote2 =
    await api.functional.communityPlatform.user.commentVotes.users.updateCommentVoteByUser(
      userConnection,
      {
        commentVoteId,
        body: updateBody2,
      },
    );
  typia.assert(updatedVote2);
  // 6. Validate returned vote has expected new voteType
  TestValidator.equals(
    "vote_type changed back to upvote",
    updatedVote2.voteType,
    "upvote",
  );
  TestValidator.equals("commentVoteId is same", updatedVote2.id, commentVoteId);
  TestValidator.predicate(
    "updatedAt is newer or equal",
    updatedVote2.updatedAt >= updatedVote2.createdAt,
  );
  TestValidator.predicate(
    "deletedAt is null or undefined",
    updatedVote2.deletedAt === null || updatedVote2.deletedAt === undefined,
  );
}
