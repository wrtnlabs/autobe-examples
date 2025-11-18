import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate not-found behavior when requesting guest user details using a
 * non-existent identifier while authenticated as a guestUser.
 *
 * Business objectives
 *
 * - Ensure the detail endpoint does not accidentally return an ITodoAppGuestUser
 *   record when the requested id does not exist.
 * - Confirm that the system returns an HttpError-style failure instead of a
 *   successful 200 response.
 * - Verify that the error payload does not expose internal persistence
 *   implementation details such as Prisma table names or raw SQL fragments.
 * - Exercise the endpoint using a realistic valid guestUser Authorization context
 *   obtained from POST /auth/guestUser/join.
 *
 * Test steps
 *
 * 1. Call api.functional.auth.guestUser.join once with a minimal valid
 *    ITodoAppGuestUser.IJoin body (e.g., omit display_name) to obtain an
 *    ITodoAppGuestUser.IAuthorized payload. This also causes the SDK to set the
 *    Authorization header on the provided connection.
 * 2. Generate a random UUID string (string & tags.Format<"uuid">) that is
 *    extremely unlikely to correspond to an existing todo_app_guestusers.id in
 *    the database.
 * 3. Call api.functional.todoApp.guestUser.guestUsers.at with props.guestUserId
 *    equal to the generated UUID while reusing the same connection instance so
 *    that a valid guestUser token is present.
 * 4. Expect the call to fail with an HttpError, because the referenced guest
 *    record should not exist. Use TestValidator.error to assert that an error
 *    is thrown rather than a successful ITodoAppGuestUser response.
 * 5. Inside the error handling assertion, verify that:
 *
 *    - The thrown error is an instance of api.HttpError.
 *    - Its serialized payload via toJSON() does not contain obviously sensitive
 *         internal details such as the literal substring "todo_app_guestusers"
 *         or "Prisma" or "SELECT" that would indicate raw SQL or ORM internals
 *         being leaked.
 *    - The error message text remains non-empty and human-readable, but do not
 *         assert an exact string value.
 * 6. Do not assert on the exact numeric HTTP status code to avoid coupling this
 *    test to specific status code policy.
 */
export async function test_api_guest_user_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Initialize guest user authorization context via join endpoint
  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {},
    });
  typia.assert(authorized);

  // 2. Generate a random UUID string that is extremely unlikely to exist
  const unknownGuestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3-5. Attempt to load the non-existent guest user detail and validate error shape
  await TestValidator.error(
    "guest user detail with unknown id must fail and not leak internals",
    async () => {
      try {
        await api.functional.todoApp.guestUser.guestUsers.at(connection, {
          guestUserId: unknownGuestUserId,
        });
      } catch (exp) {
        // Ensure the error is an HttpError instance
        TestValidator.predicate(
          "error should be instance of HttpError",
          exp instanceof api.HttpError,
        );

        if (exp instanceof api.HttpError) {
          const json = exp.toJSON<unknown>();
          const rawMessage = json.message;

          let messageText: string | null = null;
          if (typeof rawMessage === "string") {
            messageText = rawMessage;
          } else if (rawMessage !== null && rawMessage !== undefined) {
            try {
              messageText = JSON.stringify(rawMessage);
            } catch {
              messageText = "";
            }
          }

          if (messageText !== null) {
            // Message should be non-empty
            TestValidator.predicate(
              "error message should be non-empty",
              messageText.trim().length > 0,
            );

            const lowered = messageText.toLowerCase();

            // Ensure no obvious internal implementation details leak out
            TestValidator.predicate(
              "error message must not expose todo_app_guestusers table name",
              lowered.indexOf("todo_app_guestusers") === -1,
            );
            TestValidator.predicate(
              "error message must not expose Prisma internals",
              lowered.indexOf("prisma") === -1,
            );
            TestValidator.predicate(
              "error message must not expose raw SQL keywords like SELECT",
              lowered.indexOf("select ") === -1,
            );
          }
        }

        // Re-throw so that TestValidator.error can observe the failure
        throw exp;
      }

      // If no error was thrown, explicitly fail the test by throwing
      throw new Error(
        "guest user detail request unexpectedly succeeded for unknown id",
      );
    },
  );
}
