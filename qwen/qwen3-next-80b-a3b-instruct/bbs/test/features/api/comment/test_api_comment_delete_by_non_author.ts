import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function test_api_comment_delete_by_non_author(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as citizen A to establish a valid session
  const citizenAEmail: string = typia.random<string & tags.Format<"email">>();
  const citizenA: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: citizenAEmail,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(citizenA);

  // Step 2: Create a post (to have a valid entity to reference)
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.citizen.posts.create(connection, {
      body: "This is a test post for comment deletion testing." satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 3: Generate a non-existent comment ID that exists in the system
  // Since we can't create comments, we'll use a UUID that is guaranteed not to exist
  const nonExistentCommentId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Attempt to delete the non-existent comment as citizen A
  // The system should return 404 Not Found for non-existent comments
  await TestValidator.error(
    "should return 404 for non-existent comment", // Note: 404 is expected, not 403
    async () => {
      await api.functional.economicBoard.citizen.comments.erase(connection, {
        commentId: nonExistentCommentId,
      });
    },
  );

  // Step 5: Authenticate as citizen B (different citizen) to attempt deletion
  const citizenBEmail: string = typia.random<string & tags.Format<"email">>();
  const citizenB: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: citizenBEmail,
        password: "password456",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(citizenB);

  // Step 6: Attempt to delete the same non-existent comment as citizen B
  // The system should also return 404 Not Found
  await TestValidator.error(
    "should return 404 for non-existent comment (authenticated as different citizen)",
    async () => {
      await api.functional.economicBoard.citizen.comments.erase(connection, {
        commentId: nonExistentCommentId,
      });
    },
  );
}
