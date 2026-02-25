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

export async function test_api_comment_vote_update_downvote_to_upvote(
  connection: api.IConnection,
) {
  // 1. User registration and login
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // 2. Prepare a comment ID for voting (simulate random UUID - valid format for testing)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Cast initial downvote
  const initialVote =
    await generate_random_community_platform_comment_votes_create(
      userConnection,
      {
        body: {
          communityPlatformCommentId: commentId,
          voteType: "downvote",
        },
      },
    );
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote downvote",
    initialVote.downvoteCount > 0,
    true,
  );
  // 4. Update existing downvote to upvote
  const updatedVote =
    await generate_random_community_platform_comment_votes_create(
      userConnection,
      {
        body: {
          communityPlatformCommentId: commentId,
          voteType: "upvote",
        },
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "voteType updated to upvote",
    updatedVote.upvoteCount > 0,
    true,
  );
  TestValidator.equals(
    "voteType updated from downvote",
    updatedVote.downvoteCount === 0,
    true,
  );
  // 5. Validate vote counts changed correctly
  TestValidator.predicate(
    "upvoteCount is greater than zero",
    updatedVote.upvoteCount > 0,
  );
  TestValidator.predicate(
    "downvoteCount is zero after vote change",
    updatedVote.downvoteCount === 0,
  );
}
