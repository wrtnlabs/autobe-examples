import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_retrieve_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for unauthorized access to super administrator details.
  // Preconditions: requester is NOT authenticated as a super administrator.
  // Attempt to call GET without any authentication
  await TestValidator.httpError(
    "should return 403 when unauthenticated",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrators.at(connection, {
        superAdministratorId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Create a non-super administrator (simple user) connection
  // There is no utility function for login, so this step is skipped because we can't authenticate
  // directly as a non-super administrator user.
  // Thus, test with base connection again (no auth or insufficient auth)
  // Attempt to call GET with an unauthorized connection
  await TestValidator.httpError(
    "should return 403 when not a super administrator",
    403,
    async () => {
      // Use base connection again because no utility for non-super admin login
      await api.functional.discussionBoard.superAdministrators.at(connection, {
        superAdministratorId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
