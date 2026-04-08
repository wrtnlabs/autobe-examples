import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful new guest registration with device fingerprint authentication.
 *
 * Validates the complete guest registration flow including device fingerprint generation, session context creation, and authorization token issuance. Ensures that the guest join endpoint correctly creates a new guest account and returns properly structured authorization tokens with expiration metadata.
 *
 * Special attention is given to verifying that the response contains all required fields (id, token.access, token.refresh, token.expired_at, token.refreshable_until) and that the tokens follow the IAuthorizationToken structure with valid date-time formats.
 *
 * 1. Create a new guest connection from the base connection.
 * 2. Register a new guest using the authorize_guest_join utility function with random device fingerprint and session context.
 * 3. Validate the IAuthorized response structure using typia.assert.
 * 4. Verify that the guest ID is a valid UUID format.
 * 5. Verify that access and refresh tokens are non-empty strings.
 * 6. Verify that expiration timestamps are valid date-time formats.
 */
export async function test_api_guest_join_new_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register new guest using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(authorized);
  // 3. Validate guest ID is a valid UUID
  TestValidator.predicate(
    "guest ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // 4. Validate access token is non-empty
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  // 5. Validate refresh token is non-empty
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 6. Validate expired_at is valid date-time
  TestValidator.predicate(
    "expired_at is valid date-time format",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  // 7. Validate refreshable_until is valid date-time
  TestValidator.predicate(
    "refreshable_until is valid date-time format",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // 8. Validate refreshable_until is after expired_at (session lasts longer than access token)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(authorized.token.refreshable_until) >
      new Date(authorized.token.expired_at),
  );
}
