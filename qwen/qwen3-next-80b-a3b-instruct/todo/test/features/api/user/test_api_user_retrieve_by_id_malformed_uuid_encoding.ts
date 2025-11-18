import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of user account with malformed UUID encoding.
 *
 * Validates that the system properly rejects malformed UUID encoding in path
 * parameters. This test follows a realistic workflow:
 *
 * 1. Creates a valid user account via join endpoint
 * 2. Attempts to retrieve the user with a malformed UUID encoding in the path
 *    parameter
 * 3. Confirms the system returns a 404 or validation error instead of accepting
 *    malformed data
 *
 * Important: This test specifically targets URL encoding issues, NOT type
 * validation. The UUID itself is valid, but we test if the system correctly
 * handles malformed URL encoding of it.
 */
export async function test_api_user_retrieve_by_id_malformed_uuid_encoding(
  connection: api.IConnection,
) {
  // 1. Create a valid user account
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "SecurePass123!";

  const joinedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinedUser);

  // 2. Get the valid UUID from the created user
  const validUserId: string = joinedUser.id;

  // 3. Test with malformed URL encoding by introducing invalid URL encoding
  // We use two different malformed encoding patterns as explicit test cases

  // Malformed pattern 1: Replacing valid characters with invalid URL encodings
  // Example: Replace "-" with "%2d" (which is valid but improper for UUID),
  // and "0" with "%30" (which is valid but breaks UUID format as per RFC 4122)
  const malformedUuid1 = validUserId.replace(/-/g, "%2d").replace(/0/g, "%30");

  // Malformed pattern 2: Double encoding a portion of the UUID
  // Example: Encode part of UUID that already contains known URL-safe characters
  const malformedUuid2 = validUserId.replace(/-/g, "%252d"); // Double encoding "-"

  // Try to retrieve with malformed UUID 1
  await TestValidator.error(
    "malformed UUID encoding with %2d and %30 should be rejected",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: malformedUuid1,
      });
    },
  );

  // Try to retrieve with malformed UUID 2 (double encoded)
  await TestValidator.error(
    "doubly encoded UUID (%%252d) should be rejected",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: malformedUuid2,
      });
    },
  );

  // Additionally, test with an empty string (another form of malformed encoding)
  await TestValidator.error(
    "empty string as userId should be rejected",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: "",
      });
    },
  );

  // Test with a non-UUID string (non-compliant format)
  await TestValidator.error(
    "non-UUID string 'invalid' as userId should be rejected",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: "invalid",
      });
    },
  );
}
