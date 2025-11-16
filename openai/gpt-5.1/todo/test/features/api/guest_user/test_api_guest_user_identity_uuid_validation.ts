import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate retrieval of a guest user identity by UUID after guest join.
 *
 * Business context:
 *
 * - A guestUser actor is established via POST /auth/guestUser/join, which returns
 *   ITodoAppGuestUser.IAuthorized including both token and the associated guest
 *   identity summary.
 * - The guest identity table todo_app_guestusers is exposed via GET
 *   /todoApp/guestUser/guestUsers/{guestUserId}, which should return a detailed
 *   ITodoAppGuestUser record when queried by a valid UUID primary key.
 *
 * Test goals:
 *
 * 1. Ensure that, after a successful guestUser join, the service can retrieve the
 *    corresponding guest identity by its UUID using the
 *    /todoApp/guestUser/guestUsers/{guestUserId} endpoint.
 * 2. Confirm that the returned ITodoAppGuestUser payload is structurally valid
 *    (via typia.assert) and that its `id` matches the `guest.id` from the
 *    authorized join response.
 * 3. Respect the constraint that guestUserId is statically typed as `string &
 *    tags.Format<"uuid">`, so we do not attempt any invalid UUID format testing
 *    or type violations.
 */
export async function test_api_guest_user_identity_uuid_validation(
  connection: api.IConnection,
) {
  // 1. Establish a guestUser identity and session via join API.
  const joinRequestBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://todo.example.com/landing",
    referrer: "https://example.com/campaign",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorized);

  // 2. Retrieve the guest identity record by UUID using the `guest.id` from join.
  const guestId = authorized.guest.id;

  const guest: ITodoAppGuestUser =
    await api.functional.todoApp.guestUser.guestUsers.at(connection, {
      guestUserId: guestId,
    });
  typia.assert(guest);

  // 3. Validate that the retrieved record matches the identity from join.
  TestValidator.equals(
    "guest identity id should match join payload guest.id",
    guest.id,
    guestId,
  );
}
