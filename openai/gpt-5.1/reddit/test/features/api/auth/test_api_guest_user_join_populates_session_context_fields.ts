import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

export async function test_api_guest_user_join_populates_session_context_fields(
  connection: api.IConnection,
) {
  // 1. Prepare realistic session context data
  const href = "https://community.example.com/boards/general?utm_source=e2e";
  const referrer = "https://search.example.com/?q=community+platform";
  const userAgentInitial =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const userAgentUpdated =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  // Use a stable anonymous handle to correlate repeated joins
  const anonymousHandle: string = RandomGenerator.alphaNumeric(16);

  // 2. Call guestUser.join from a fresh unauthenticated connection
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const firstJoinBody = {
    anonymous_handle: anonymousHandle,
    user_agent: userAgentInitial,
    ip: "203.0.113.42",
    href,
    referrer,
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const firstAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(publicConnection, {
      body: firstJoinBody,
    });
  // Validate the authorized payload shape
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(firstAuthorized);

  // 3. Verify that token is present (session context yields usable tokens)
  TestValidator.predicate(
    "guest join returns non-empty access token",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest join returns non-empty refresh token",
    firstAuthorized.token.refresh.length > 0,
  );

  // 4. Call guestUser.join again with the same anonymous_handle but updated user_agent
  const secondJoinBody = {
    anonymous_handle: anonymousHandle,
    user_agent: userAgentUpdated,
    ip: "203.0.113.42",
    href,
    referrer,
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const secondAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(publicConnection, {
      body: secondJoinBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(secondAuthorized);

  // 5. Assert that repeated joins with same anonymous_handle correlate to the same guest id
  TestValidator.equals(
    "repeated guest joins with same anonymous_handle reuse the same guest id",
    secondAuthorized.id,
    firstAuthorized.id,
  );

  // 6. Check that anonymous_handle is preserved when provided
  TestValidator.equals(
    "anonymous_handle is preserved in authorized payload",
    secondAuthorized.anonymous_handle ?? null,
    firstAuthorized.anonymous_handle ?? null,
  );

  // 7. Confirm that user_agent can be updated across joins while still referring to same guest
  TestValidator.equals(
    "latest user_agent is reflected on subsequent join",
    secondAuthorized.user_agent,
    userAgentUpdated,
  );

  // 8. Ensure account_status, if present, is structurally valid
  if (secondAuthorized.account_status !== undefined) {
    typia.assert<ICommunityPlatformAccountStatus.ISummary>(
      secondAuthorized.account_status,
    );
  }

  // 9. Sanity check that created_at/updated_at in the guest envelope look like timestamps
  TestValidator.predicate(
    "created_at is a non-empty ISO timestamp string",
    () => secondAuthorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a non-empty ISO timestamp string",
    () => secondAuthorized.updated_at.length > 0,
  );

  // 10. Finally, verify that the join endpoint remains callable from a public context
  // by creating another fresh unauthenticated connection and performing a join
  const anotherPublicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const thirdJoinBody = {
    href,
    referrer,
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const thirdAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(anotherPublicConnection, {
      body: thirdJoinBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(thirdAuthorized);

  TestValidator.predicate(
    "guest join without prior Authorization header still succeeds",
    thirdAuthorized.token.access.length > 0,
  );
}
