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

export async function test_api_admin_comment_vote_score_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function and capture result
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Update connection headers with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authResult.token.access,
  };
  // Generate a realistic comment ID (using UUID format)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve vote score statistics for the comment
  const voteScore =
    await api.functional.communityPlatform.admin.comments.vote_score.at(
      adminConnection,
      { commentId },
    );
  // Validate the response structure
  typia.assert(voteScore);
  // Validate vote score properties
  TestValidator.predicate(
    "vote score has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      voteScore.id,
    ),
  );
  TestValidator.predicate(
    "upvote count is non-negative integer",
    voteScore.upvote_count >= 0 && Number.isInteger(voteScore.upvote_count),
  );
  TestValidator.predicate(
    "downvote count is non-negative integer",
    voteScore.downvote_count >= 0 && Number.isInteger(voteScore.downvote_count),
  );
  TestValidator.equals(
    "score equals upvotes minus downvotes",
    voteScore.score,
    voteScore.upvote_count - voteScore.downvote_count,
  );
  TestValidator.predicate(
    "last updated timestamp is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      voteScore.last_updated_at,
    ),
  );
  TestValidator.predicate(
    "created timestamp is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      voteScore.created_at,
    ),
  );
}
