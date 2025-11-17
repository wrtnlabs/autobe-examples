import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function test_api_comment_delete_already_deleted(
  connection: api.IConnection,
) {
  // Authenticate as citizen
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = "securePassword123";
  const href = "https://example.com/join";
  const referrer = "https://example.com/home";

  const citizen: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: citizenEmail,
        password: citizenPassword,
        href,
        referrer,
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(citizen);

  // Create a post to host the comment (required for comment endpoint)
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.citizen.posts.create(connection, {
      body: typia.random<IEconomicBoardPost.ICreate>(),
    });
  typia.assert(post);

  // Generate a non-existent comment ID (simulating deleted comment)
  // We use UUID format as per system conventions
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete a non-existent comment (simulating deletion of an already deleted comment)
  await TestValidator.error("cannot delete non-existent comment", async () => {
    await api.functional.economicBoard.citizen.comments.erase(connection, {
      commentId: nonExistentCommentId,
    });
  });
}
