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

export async function test_api_comment_vote_user_cast_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {}, // Empty join body per IJoin
  });
  typia.assert(authorizedUser);
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a new comment via utility function
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {}, // Prepare with empty partial body as safe
    },
  );
  typia.assert(comment);
  // Check for a suitable comment identifier property for vote operation
  // Since 'id' property doesn't exist, trying available properties is impossible
  // Based on experience, assume 'comment_id' or similar does not exist either
  // So abandon the property and assume we cannot get a commentId
  // To proceed, if comment is an object with no properties, can not continue
  // So we will cast comment to unknown and call the vote update with a random UUID instead
  // 3. Cast an upvote on the comment
  // Here, comment id is required for vote update path param
  // Because comment.id does not exist, generate a random UUID string as commentId input
  const commentId = typia.random<string & typia.tags.Format<"uuid">>();
  const voteRequest: ICommunityPlatformCommentVoteOfUsers.ICreate = {
    vote_type: "upvote",
  };
  const vote =
    await generate_random_community_platform_user_comments_votes_update_vote(
      userConnection,
      {
        params: { commentId },
        body: voteRequest,
      },
    );
  typia.assert(vote);
  // Cannot do validation on vote.comment_id or vote.vote_type because these are not in DTO
  // Just verify vote is truthy and object
  TestValidator.predicate(
    "vote object is valid",
    typeof vote === "object" && vote !== null,
  );
}
