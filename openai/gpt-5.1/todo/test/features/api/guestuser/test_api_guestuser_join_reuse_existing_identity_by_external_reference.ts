import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate guestUser identity reuse by external_reference while creating new
 * sessions.
 *
 * Business intent:
 *
 * - External_reference is a stable key that should map repeat join calls to the
 *   same guest identity record in todo_app_guestusers.
 * - Each POST /auth/guestUser/join invocation must still create a new
 *   todo_app_guestuser_sessions row linked to that identity, issuing fresh JWT
 *   token information.
 *
 * Test flow:
 *
 * 1. Generate a stable external_reference string for this test run.
 * 2. Call join() with that external_reference, an initial display_name, and
 *    realistic href/referrer URLs to open the first guest session.
 * 3. Call join() again with the same external_reference but different display_name
 *    and navigation context to simulate a new visit.
 * 4. Assert that the guest identity (guest.id) is reused across both calls.
 * 5. Assert that the session identifier (session.id) differs, confirming a new
 *    session was created.
 * 6. Assert that each session.guestUser.id matches the shared guest.id.
 * 7. Perform lightweight checks on display_name behavior and token shapes.
 */
export async function test_api_guestuser_join_reuse_existing_identity_by_external_reference(
  connection: api.IConnection,
) {
  // 1. Prepare a stable external_reference and first join payload
  const externalReference: string = `ext-${RandomGenerator.alphaNumeric(16)}`;

  const href1 = "https://todo.example.com/landing" as string &
    tags.Format<"uri">;
  const referrer1 = "https://marketing.example.com/campaign" as string &
    tags.Format<"uri">;

  const firstRequestBody = {
    external_reference: externalReference,
    display_name: "First Guest Session",
    href: href1,
    referrer: referrer1,
  } satisfies ITodoAppGuestUserJoin.IRequest;

  // 2. First join call
  const firstAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: firstRequestBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(firstAuthorized);

  const firstGuest = firstAuthorized.guest;
  const firstSession = firstAuthorized.session;
  typia.assert<ITodoAppGuestUser.ISummary>(firstGuest);
  typia.assert<ITodoAppGuestUserSession.ISummary>(firstSession);

  // Basic sanity checks for token fields
  const firstToken: IAuthorizationToken = firstAuthorized.token;
  typia.assert<IAuthorizationToken>(firstToken);
  TestValidator.predicate(
    "first access token must be non-empty",
    firstToken.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh token must be non-empty",
    firstToken.refresh.length > 0,
  );

  // 3. Prepare second join payload with same external_reference but different context
  const href2 = "https://todo.example.com/another-page" as string &
    tags.Format<"uri">;
  const referrer2 = "https://referrer.example.net/article" as string &
    tags.Format<"uri">;

  const secondRequestBody = {
    external_reference: externalReference,
    display_name: "Second Guest Session",
    href: href2,
    referrer: referrer2,
  } satisfies ITodoAppGuestUserJoin.IRequest;

  // 4. Second join call
  const secondAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondRequestBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(secondAuthorized);

  const secondGuest = secondAuthorized.guest;
  const secondSession = secondAuthorized.session;
  typia.assert<ITodoAppGuestUser.ISummary>(secondGuest);
  typia.assert<ITodoAppGuestUserSession.ISummary>(secondSession);

  const secondToken: IAuthorizationToken = secondAuthorized.token;
  typia.assert<IAuthorizationToken>(secondToken);
  TestValidator.predicate(
    "second access token must be non-empty",
    secondToken.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh token must be non-empty",
    secondToken.refresh.length > 0,
  );

  // 5. Assert guest identity reuse via external_reference
  TestValidator.equals(
    "guest id must be reused when external_reference matches",
    secondGuest.id,
    firstGuest.id,
  );

  // 6. Assert that a new session has been created
  TestValidator.notEquals(
    "each join invocation must create a distinct session id",
    secondSession.id,
    firstSession.id,
  );

  // 7. Assert that each session is linked to the same guest identity
  TestValidator.equals(
    "first session.guestUser.id must match guest.id",
    firstSession.guestUser.id,
    firstGuest.id,
  );
  TestValidator.equals(
    "second session.guestUser.id must match guest.id",
    secondSession.guestUser.id,
    secondGuest.id,
  );

  // 8. Display name handling: ensure it is present and non-empty in both responses.
  // Business rules do not mandate whether the second display_name overwrites
  // the first, so we only check for non-empty, non-whitespace when present.
  if (
    firstGuest.display_name !== null &&
    firstGuest.display_name !== undefined
  ) {
    TestValidator.predicate(
      "first guest display_name, when present, must be non-empty",
      firstGuest.display_name.trim().length > 0,
    );
  }
  if (
    secondGuest.display_name !== null &&
    secondGuest.display_name !== undefined
  ) {
    TestValidator.predicate(
      "second guest display_name, when present, must be non-empty",
      secondGuest.display_name.trim().length > 0,
    );
  }

  // 9. Ensure session context reflects the second request values where appropriate.
  // We cannot assert server behavior for href/referrer beyond type correctness,
  // but at minimum they must be non-empty strings.
  TestValidator.predicate(
    "first session href must be non-empty",
    firstSession.href.length > 0,
  );
  TestValidator.predicate(
    "first session referrer must be non-empty",
    firstSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "second session href must be non-empty",
    secondSession.href.length > 0,
  );
  TestValidator.predicate(
    "second session referrer must be non-empty",
    secondSession.referrer.length > 0,
  );
}
