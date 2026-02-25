import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comment_vote_score_controversial(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Since we cannot create comments or votes with available API functions,
  // we'll test the vote score retrieval endpoint with a random comment ID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve vote score for the comment
  const voteScore =
    await api.functional.communityPlatform.admin.comments.vote_score.at(
      adminConnection,
      { commentId },
    );
  // Validate the response structure
  typia.assert(voteScore);
  // Validate vote score properties
  TestValidator.equals("vote score has id", typeof voteScore.id, "string");
  TestValidator.predicate("upvote count is integer", () =>
    Number.isInteger(voteScore.upvote_count),
  );
  TestValidator.predicate("downvote count is integer", () =>
    Number.isInteger(voteScore.downvote_count),
  );
  TestValidator.predicate("score is integer", () =>
    Number.isInteger(voteScore.score),
  );
  TestValidator.predicate(
    "score calculation",
    () => voteScore.score === voteScore.upvote_count - voteScore.downvote_count,
  );
  TestValidator.predicate(
    "last updated at is date string",
    () => !isNaN(new Date(voteScore.last_updated_at).getTime()),
  );
  TestValidator.predicate(
    "created at is date string",
    () => !isNaN(new Date(voteScore.created_at).getTime()),
  );
}
