import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test session retrieval for non-existent session identifiers.
 *
 * Validates that the session retrieval endpoint correctly handles invalid or non-existent session UUIDs by returning a 404 Not Found response. Ensures that the system securely manages nonexistent identifiers without exposing internal application state or causing unhandled errors.
 *
 * 1. Generate a valid UUID for a non-existent session.
 * 2. Attempt to retrieve the session using the generated UUID.
 * 3. Verify that the API throws an HTTP error with status code 404.
 */
export async function test_api_session_retrieve_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a valid UUID for a non-existent session
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 2 & 3. Attempt retrieval and verify 404 Not Found error
  await TestValidator.httpError(
    "session not found",
    404,
    async () =>
      await api.functional.todoApp.sessions.at(connection, {
        sessionId: sessionId,
      }),
  );
}
