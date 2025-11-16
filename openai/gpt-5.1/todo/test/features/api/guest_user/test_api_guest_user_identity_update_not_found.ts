import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate that updating a non-existent guest user identity fails without
 * creating a new record.
 *
 * Business context:
 *
 * - Guest identities live in todo_app_guestusers and are updated via PUT
 *   /todoApp/guestUser/guestUsers/{guestUserId}.
 * - The join endpoint /auth/guestUser/join creates or reuses a guest identity and
 *   issues a guestUser JWT; our test must ensure that a valid token is not the
 *   source of the failure.
 * - When a client attempts to update a guestUserId that does not exist, the
 *   system must signal a not-found style failure instead of silently creating a
 *   new identity or succeeding.
 *
 * Test flow:
 *
 * 1. Establish an authenticated guestUser context by calling auth.guestUser.join
 *    with a fully valid ITodoAppGuestUserJoin.IRequest payload.
 * 2. Capture the created/reused guest identity from the
 *    ITodoAppGuestUser.IAuthorized response and assert its shape with
 *    typia.assert.
 * 3. Generate a random UUID that is guaranteed to differ from the authorized
 *    guest.guest.id (e.g., loop until typia.random<uuid>() !==
 *    guest.guest.id).
 * 4. Build a valid ITodoAppGuestUser.IUpdate request body containing updated
 *    external_reference, display_name, and status values.
 * 5. Invoke api.functional.todoApp.guestUser.guestUsers.update with the random
 *    non-existent guestUserId and the valid update body, under the same
 *    authenticated connection.
 * 6. Use TestValidator.error with an async closure to assert that the update call
 *    fails. Per global rules, do not inspect HttpError.status or error message;
 *    only check that an error is thrown.
 *
 * Notes and constraints:
 *
 * - Do NOT attempt to validate HTTP status codes (e.g., 404) or error payloads.
 * - Do NOT send intentionally wrong types or omit required fields; the request
 *   must be structurally valid and type-safe.
 * - Rely on the SDK to manage Authorization headers; do not touch
 *   connection.headers.
 */
export async function test_api_guest_user_identity_update_not_found(
  connection: api.IConnection,
) {
  // 1. Establish authenticated guestUser context via join
  const joinBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/todo?source=e2e",
    referrer: "https://example.com/landing",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const authorized = await api.functional.auth.guestUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  // 2. Extract the real guest id for comparison
  const existingGuestId = authorized.guest.id;

  // 3. Generate a UUID that is guaranteed to differ from existingGuestId
  let missingGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  while (missingGuestId === existingGuestId) {
    missingGuestId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Build a valid ITodoAppGuestUser.IUpdate payload
  const updateBody = {
    external_reference: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.name(),
    status: "archived",
  } satisfies ITodoAppGuestUser.IUpdate;

  // 5-6. Attempt to update non-existent guestUserId and assert error
  await TestValidator.error(
    "updating non-existent guest user identity must fail without creation",
    async () => {
      await api.functional.todoApp.guestUser.guestUsers.update(connection, {
        guestUserId: missingGuestId,
        body: updateBody,
      });
    },
  );
}
