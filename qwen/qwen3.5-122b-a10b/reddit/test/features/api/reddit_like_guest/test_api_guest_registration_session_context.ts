import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test session context tracking during guest registration.
 *
 * Validates that the guest registration endpoint properly captures and stores session context information including landing page URL (href), referrer URL, and IP address. This ensures analytics and security monitoring capabilities function correctly when new guest accounts are created.
 *
 * The test registers a guest with specific session context values and verifies the authorization response contains the expected guest identifier and JWT tokens.
 *
 * 1. Prepare custom session context values (href, referrer, optional IP).
 * 2. Register guest using authorize_guest_join utility with context data.
 * 3. Verify response contains valid guest_id in UUID format.
 * 4. Validate token structure with access, refresh, and expiration fields.
 * 5. Confirm all session context fields were accepted in the registration request.
 */
export async function test_api_guest_registration_session_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare session context values
  const href: string & typia.tags.Format<"uri"> =
    "https://example.com/landing-page?campaign=test";
  const referrer: string & typia.tags.Format<"uri"> =
    "https://google.com/search?q=reddit+clone";
  const ip: string & typia.tags.Format<"ipv4"> = "192.168.1.100";
  // 2. Register guest with session context
  const authorized: IRedditLikeGuest.IAuthorized = await authorize_guest_join(
    connection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href,
        referrer,
        ip,
      } satisfies IRedditLikeGuest.IJoin,
    },
  );
  typia.assert(authorized);
  // 3. Verify guest_id is valid UUID
  TestValidator.predicate(
    "guest_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.guest_id,
    ),
  );
  // 4. Validate token structure
  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    !Number.isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO datetime",
    !Number.isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // 5. Verify expiration timestamps are in the future
  const now: number = Date.now();
  TestValidator.predicate(
    "access token expires in the future",
    Date.parse(authorized.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable until is after access token expiration",
    Date.parse(authorized.token.refreshable_until) >
      Date.parse(authorized.token.expired_at),
  );
}
