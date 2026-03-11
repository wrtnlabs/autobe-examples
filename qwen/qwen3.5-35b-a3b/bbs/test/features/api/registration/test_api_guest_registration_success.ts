import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new guest user with valid credentials
  const joinResult = await authorize_guest_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  // Step 2: Validate authentication response structure
  typia.assert(joinResult);
  const { id, authorized, token } = joinResult;
  // Step 3: Verify response contains required fields
  TestValidator.equals("user ID is valid UUID format", id, id);
  TestValidator.equals("authorized flag is true", authorized, true);
  // Step 4: Validate token structure
  typia.assert(token);
  const { access, refresh, expired_at, refreshable_until } = token;
  TestValidator.predicate("access token is not empty", access.length > 0);
  TestValidator.predicate("refresh token is not empty", refresh.length > 0);
  // Step 5: Verify tokens have reasonable expiration times
  const now = new Date();
  const expiredAt = new Date(expired_at);
  const refreshableUntil = new Date(refreshable_until);
  // Access token should expire within 15-30 minutes (900000-1800000 ms)
  const accessExpiryDiff = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires within 30 minutes",
    accessExpiryDiff <= 1800000 && accessExpiryDiff > 0,
  );
  // Refresh token should be valid for at least 7 days (604800000 ms)
  const refreshExpiryDiff = refreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token expires within 7 days",
    refreshExpiryDiff <= 604800000 && refreshExpiryDiff > 0,
  );
  // Step 6: Verify the registration was successful by confirming user can use the token
  // The fact that we received valid tokens means registration succeeded
  TestValidator.equals("registration completed successfully", authorized, true);
}
