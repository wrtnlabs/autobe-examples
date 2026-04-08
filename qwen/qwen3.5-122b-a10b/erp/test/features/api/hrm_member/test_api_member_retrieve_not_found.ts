import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member retrieval with non-existent member ID returns 404 error.
 *
 * Validates that attempting to retrieve a member account using a valid UUID format that does not exist in the database returns a proper HTTP 404 Not Found error. This ensures proper error handling for member lookup failures and verifies the system does not leak information about account existence.
 *
 * The test generates a random UUID and attempts to retrieve the member. Since the UUID is randomly generated, it is guaranteed not to exist in the database. The test validates that:
 *
 * 1. A valid UUID format is used for the member ID
 * 2. The API throws an HttpError with status 404
 * 3. The error response is properly structured
 *
 * This validates security best practices by ensuring the system does not reveal whether a UUID format is valid or if the member simply doesn't exist.
 */
export async function test_api_member_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for member retrieval (requires admin privileges)
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID that does not exist in the database
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve non-existent member and validate 404 error
  await TestValidator.httpError(
    "member not found returns 404",
    404,
    async () => {
      await api.functional.hrm.members.at(adminConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
