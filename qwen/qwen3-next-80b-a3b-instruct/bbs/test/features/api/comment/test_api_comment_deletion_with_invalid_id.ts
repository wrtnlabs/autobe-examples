import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_comment_deletion_with_invalid_id(
  connection: api.IConnection,
) {
  const citizen = await api.functional.auth.citizen.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IEconomicBoardCitizen.ICreate,
  });
  typia.assert(citizen);

  // Create an invalid comment ID (random UUID that doesn't exist)
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();

  // Try to delete comment with invalid ID - should return 404 error
  await TestValidator.error(
    "delete comment with invalid ID should fail",
    async () => {
      await api.functional.economicBoard.comments.erase(connection, {
        commentId: invalidCommentId,
      });
    },
  );
}
