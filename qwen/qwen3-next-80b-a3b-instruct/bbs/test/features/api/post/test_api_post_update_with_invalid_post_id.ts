import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function test_api_post_update_with_invalid_post_id(
  connection: api.IConnection,
) {
  // Create admin account for authentication
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Generate a non-existent postId (valid UUID format but not existing in database)
  const invalidPostId: string = typia.random<string & tags.Format<"uuid">>();

  // Attempt to update a post with non-existent postId - should return 404 Not Found
  await TestValidator.error(
    "updating non-existent post should return 404",
    async () => {
      await api.functional.economicBoard.member.posts.update(connection, {
        postId: invalidPostId,
        body: {
          subject: "Updated subject",
          content: "Updated content",
        } satisfies IEconomicBoardPost.IUpdate,
      });
    },
  );
}
