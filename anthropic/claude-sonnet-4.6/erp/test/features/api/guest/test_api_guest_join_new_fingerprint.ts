import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_new_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create a unique fingerprint for this new guest visitor
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // Create a guest-specific connection (NEVER use base connection directly)
  const guestConnection: api.IConnection = { host: connection.host };
  // Use the mandatory utility function authorize_guest_join for POST /erpHrm/auth/guest/join
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint,
      href: "https://example.com/dashboard",
      referrer: "https://google.com",
    },
  });
  // Validate full response shape
  typia.assert(authorized);
  // Verify fingerprint matches what was submitted
  TestValidator.equals(
    "fingerprint matches submitted value",
    authorized.fingerprint,
    fingerprint,
  );
  // Verify token access and refresh are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // Verify expired_at is in the future
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  // Verify refreshable_until is in the future and later than expired_at
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil > expiredAt,
  );
}
