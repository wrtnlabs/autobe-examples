import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRateLimitEvent";

/**
 * Validate behavior when an admin fetches a rate limit event by a non-existent
 * id.
 *
 * Business context
 *
 * - The GET /todoApp/adminUser/rateLimitEvents/{rateLimitEventId} endpoint lets
 *   admins inspect detailed rate limit enforcement events recorded in
 *   todo_app_rate_limit_events.
 * - When the requested UUID does not correspond to any stored event, the backend
 *   should respond with a not-found style error (typically 404), not a
 *   successful payload.
 * - This test ensures the endpoint fails predictably and does not silently
 *   succeed or return a random event for an unknown id.
 *
 * Scenario steps
 *
 * 1. Register an administrative user using POST /auth/adminUser/join so that the
 *    connection holds a valid adminUser token.
 * 2. Generate a random UUID value to use as a fake rateLimitEventId, making it
 *    extremely unlikely to match any real ITodoAppRateLimitEvent.id in the DB.
 * 3. Call GET /todoApp/adminUser/rateLimitEvents/{rateLimitEventId} with that fake
 *    id.
 * 4. Assert that the call results in an HttpError rather than returning an
 *    ITodoAppRateLimitEvent object.
 * 5. Additionally, verify that the HttpError status code is in the 4xx family
 *    (client error), without checking a specific status number to avoid relying
 *    on exact status codes.
 */
export async function test_api_admin_rate_limit_event_get_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Register an administrative user (auth.adminUser.join)
  const joinBody = typia.random<ITodoAppAdminUser.IJoin>();

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID for a non-existent rate limit event id
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();

  // 3, 4 & 5. Call the by-id endpoint and assert it fails with an HttpError
  // whose status code is a 4xx client error.
  await TestValidator.error(
    "getting non-existent rate limit event should throw 4xx HttpError",
    async () => {
      try {
        await api.functional.todoApp.adminUser.rateLimitEvents.at(connection, {
          rateLimitEventId: nonexistentId,
        });
      } catch (err) {
        // Ensure the error is an HttpError with a 4xx status code.
        if (!(err instanceof api.HttpError)) throw err;
        if (err.status < 400 || err.status >= 500) throw err;
        // Re-throwing is not needed here because TestValidator.error
        // only needs that an error was thrown; since we've reached this
        // point, the classification is acceptable.
        throw err;
      }

      // If we reach here, no error was thrown, which is a test failure.
      throw new Error(
        "Expected HttpError for non-existent rate limit event id, but call succeeded.",
      );
    },
  );
}
