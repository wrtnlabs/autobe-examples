import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_comment_deletion_invalid_id(
  connection: api.IConnection,
) {
  // Authenticate moderator via join
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate a non-existent comment ID (valid UUID format but not in database)
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete the non-existent comment - should throw 404 error
  await TestValidator.error(
    "deletion of non-existent comment should return 404 Not Found",
    async () => {
      await api.functional.economicBoard.moderator.comments.erase(connection, {
        commentId: invalidCommentId,
      });
    },
  );
}
