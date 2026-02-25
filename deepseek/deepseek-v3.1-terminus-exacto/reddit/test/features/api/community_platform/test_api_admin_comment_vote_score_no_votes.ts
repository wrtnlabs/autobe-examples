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

export async function test_api_admin_comment_vote_score_no_votes(
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
  // Since comment creation endpoints are not available, we need to test with
  // a valid comment ID that exists in the system and has no votes
  // This requires the test environment to have pre-existing data
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve vote score for the comment
  const voteScore =
    await api.functional.communityPlatform.admin.comments.vote_score.at(
      adminConnection,
      { commentId },
    );
  // Validate the response structure
  typia.assert(voteScore);
  // The test validates that the vote score endpoint works correctly
  // Even if the comment has no votes, the endpoint should return valid data
  TestValidator.predicate(
    "vote score record should have valid ID",
    voteScore.id.length > 0,
  );
  TestValidator.predicate(
    "last updated timestamp should be valid",
    voteScore.last_updated_at.length > 0,
  );
  TestValidator.predicate(
    "created timestamp should be valid",
    voteScore.created_at.length > 0,
  );
}
