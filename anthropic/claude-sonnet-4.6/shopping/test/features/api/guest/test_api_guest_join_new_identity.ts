import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_new_identity(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest-specific connection (never use base connection directly)
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare unique join inputs
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const href = "https://shoppingmall.example.com/";
  const referrer = "https://google.com";
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Call utility function (MANDATORY - utility exists for this endpoint)
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      token: fingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    },
  });
  // Full type validation
  typia.assert(authorized);
  // Validate token fields are non-empty strings
  TestValidator.predicate(
    "access token non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    authorized.token.refresh.length > 0,
  );
  // Validate token expiry: expired_at should be in the future
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil >= expiredAt,
  );
  // Validate guest fingerprint token matches what was sent
  TestValidator.equals(
    "guest token matches fingerprint",
    authorized.guest.token,
    fingerprint,
  );
  // Validate guest.sessions contains at least 1 session
  TestValidator.predicate(
    "guest has at least 1 session",
    authorized.guest.sessions.length >= 1,
  );
  // Validate top-level sessions contains at least 1 session
  TestValidator.predicate(
    "top-level sessions has at least 1 entry",
    authorized.sessions.length >= 1,
  );
  // Validate the first session's href and referrer match what was sent
  const firstSession = authorized.guest.sessions[0];
  TestValidator.equals("session href matches", firstSession.href, href);
  TestValidator.equals(
    "session referrer matches",
    firstSession.referrer,
    referrer,
  );
}
