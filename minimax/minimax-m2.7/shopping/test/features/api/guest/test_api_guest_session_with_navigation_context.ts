import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_with_navigation_context(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate navigation context - simulating user browsing from category to product page
  const productPageHref = typia.random<string & tags.Format<"uri">>();
  const categoryPageReferrer = typia.random<string & tags.Format<"uri">>();
  // Generate device fingerprint for anonymous visitor identification
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // Establish guest session with navigation context using utility function
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint,
      href: productPageHref,
      referrer: categoryPageReferrer,
    } satisfies IEcommerceMallGuest.IJoin,
  });
  // Validate the response with typia.assert()
  typia.assert(guestSession);
  // Validate session ID is a valid UUID format
  TestValidator.predicate(
    "guest session id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestSession.id,
    ),
  );
  // Validate authorization tokens exist and are non-empty
  TestValidator.predicate(
    "access token is non-empty string",
    typeof guestSession.token.access === "string" &&
      guestSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof guestSession.token.refresh === "string" &&
      guestSession.token.refresh.length > 0,
  );
  // Validate token expiration metadata
  TestValidator.predicate(
    "expired_at is valid ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guestSession.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      guestSession.token.refreshable_until,
    ),
  );
  // Validate guest connection headers were updated with access token
  TestValidator.predicate(
    "guest connection has Authorization header",
    !!guestConnection.headers?.Authorization,
  );
  TestValidator.equals(
    "Authorization header contains access token",
    guestConnection.headers?.Authorization,
    guestSession.token.access,
  );
}
