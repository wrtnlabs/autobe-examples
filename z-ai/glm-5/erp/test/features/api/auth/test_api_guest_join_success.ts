import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for registration
  const guestConnection: api.IConnection = { host: connection.host };
  // Call authorize_guest_join utility function - it handles random data generation
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      // Provide specific password to meet security requirements (8+ chars, uppercase, lowercase, number, special char)
      password: `TestPass1!${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  // Validate response structure
  typia.assert(authorized);
  // Validate member ID is valid UUID format
  TestValidator.predicate("member ID is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(authorized.id);
  });
  // Validate tokens exist and are non-empty
  TestValidator.predicate("access token exists", () => {
    return authorized.token.access.length > 0;
  });
  TestValidator.predicate("refresh token exists", () => {
    return authorized.token.refresh.length > 0;
  });
  // Validate token expiration timestamps are valid ISO date-time
  TestValidator.predicate("access token expiration is valid date-time", () => {
    const date = new Date(authorized.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refresh token expiration is valid date-time", () => {
    const date = new Date(authorized.token.refreshable_until);
    return !isNaN(date.getTime());
  });
  // Validate sessions array has at least one session
  TestValidator.predicate("has at least one session", () => {
    return authorized.sessions.length > 0;
  });
  // Validate session structure has valid guest reference
  TestValidator.predicate("session has valid guest info", () => {
    const session = authorized.sessions[0];
    if (session === undefined) return false;
    return (
      session.guest.id !== undefined && session.guest.fingerprint !== undefined
    );
  });
  // Validate member timestamps are valid ISO date-time
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(authorized.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(authorized.updated_at);
    return !isNaN(date.getTime());
  });
}
