import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";

/**
 * Validate error on listing followers for a non-existent user.
 *
 * Context:
 *
 * - GET /econDiscuss/users/{userId}/followers returns followers of the specified
 *   user.
 * - When the target user does not exist (or is inactive), the backend returns an
 *   error (contract suggests 404).
 * - The endpoint is public; no authentication is required.
 *
 * Steps:
 *
 * 1. Prepare a clearly non-existent userId (use the all-zero UUID, valid format
 *    but not present in DB).
 * 2. If running in simulation mode, call with a random UUID and assert the
 *    response type.
 * 3. Otherwise, call with the non-existent UUID and assert that an error is thrown
 *    (no strict status code assertion).
 */
export async function test_api_followers_list_user_not_found(
  connection: api.IConnection,
) {
  // 1) Prepare a non-existent UUID (valid format), coerced to the tagged type via typia.assert
  const nonexistentUserId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >("00000000-0000-0000-0000-000000000000");

  // 2) Simulation-friendly branching
  if (connection.simulate === true) {
    // In simulate mode, the SDK returns a random valid page. Validate response type.
    const page: IPageIEconDiscussUser.ISummary =
      await api.functional.econDiscuss.users.followers.index(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
      });
    typia.assert(page);
    return;
  }

  // 3) Real backend: expect an error for a non-existent user
  await TestValidator.error(
    "followers listing should error when target user does not exist",
    async () => {
      await api.functional.econDiscuss.users.followers.index(connection, {
        userId: nonexistentUserId,
      });
    },
  );
}
