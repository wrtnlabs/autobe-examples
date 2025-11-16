import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate that a newly joined guestUser can retrieve its own guest identity.
 *
 * Business context:
 *
 * - Guest visitors obtain a lightweight identity and session via
 *   /auth/guestUser/join.
 * - The backend automatically wires the JWT access token into the SDK connection.
 * - The identity detail endpoint /todoApp/guestUser/guestUsers/{guestUserId} must
 *   allow the guest to read its own minimal identity record immediately after
 *   join.
 *
 * Steps:
 *
 * 1. Call POST /auth/guestUser/join using api.functional.auth.guestUser.join with
 *    a realistic ITodoAppGuestUserJoin.IRequest payload.
 * 2. Capture the returned ITodoAppGuestUser.IAuthorized, including guest.id (the
 *    identity primary key) and rely on the SDK to attach token to the provided
 *    connection.
 * 3. Invoke GET /todoApp/guestUser/guestUsers/{guestUserId} via
 *    api.functional.todoApp.guestUser.guestUsers.at, passing guest.id as
 *    guestUserId.
 * 4. Assert that:
 *
 *    - The response conforms to ITodoAppGuestUser (via typia.assert).
 *    - The id equals the requested guestUserId.
 *    - Status is a non-empty string (basic lifecycle sanity check).
 *    - Created_at and updated_at are well-formed date-time strings by relying on
 *         typia.assert’s Format<"date-time"> guarantees.
 *    - External_reference and display_name, when provided in the join request, are
 *         reflected in the returned identity.
 */
export async function test_api_guest_user_identity_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic join request payload
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href,
    referrer,
  } satisfies ITodoAppGuestUserJoin.IRequest;

  // 2. Establish guest identity and session
  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const guestSummary = authorized.guest;
  typia.assert<ITodoAppGuestUser.ISummary>(guestSummary);

  // 3. Retrieve the guest identity by UUID using the same connection
  const guest: ITodoAppGuestUser =
    await api.functional.todoApp.guestUser.guestUsers.at(connection, {
      guestUserId: guestSummary.id,
    });
  typia.assert(guest);

  // 4. Business-level validations
  // 4-1. id must match the requested guestUserId
  TestValidator.equals(
    "guest identity id matches requested guestUserId",
    guest.id,
    guestSummary.id,
  );

  // 4-2. status should be a non-empty string (basic lifecycle sanity)
  TestValidator.predicate(
    "guest identity status is a non-empty string",
    guest.status.length > 0,
  );

  // 4-3. created_at and updated_at are already validated by typia.assert via
  // Format<"date-time">, so we only ensure updated_at is not older than
  // created_at at a basic string comparison level when both are equal length
  TestValidator.predicate(
    "guest identity updated_at is not earlier than created_at (lexicographically)",
    guest.created_at <= guest.updated_at,
  );

  // 4-4. Optional external_reference and display_name echo join payload
  TestValidator.equals(
    "guest identity external_reference echoes join request",
    guest.external_reference ?? null,
    joinBody.external_reference ?? null,
  );
  TestValidator.equals(
    "guest identity display_name echoes join request",
    guest.display_name ?? null,
    joinBody.display_name ?? null,
  );
}
