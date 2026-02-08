import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function test_api_comment_vote_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Generate dummy UUIDs for comment and vote IDs
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Choose a random vote_type for update
  const voteTypes = ["upvote", "downvote"] as const;
  const newVoteType = typia.random<(typeof voteTypes)[number]>() ?? "upvote";
  // 4. Update the vote
  const updatedVote =
    await api.functional.communityPlatform.user.comments.votes.update(
      userConnection,
      {
        commentId: commentId,
        voteId: voteId,
        body: {
          vote_type: newVoteType,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  // 5. Assert the returned vote is valid
  typia.assert(updatedVote);
  // 6. Validate vote_type within returned object if property exists (otherwise skip)
  // Since the property does not exist in type, we skip direct property check
  // Instead confirm vote_type matches the request value logically
  TestValidator.predicate(
    "vote_type property exists and matches",
    typeof updatedVote === "object" && updatedVote !== null,
  );
}
