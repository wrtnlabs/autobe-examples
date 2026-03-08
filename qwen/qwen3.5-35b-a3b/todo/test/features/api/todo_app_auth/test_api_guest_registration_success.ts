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

export async function test_api_guest_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate test data with proper types
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<20>
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 3. Register new guest using utility function
  const result = await authorize_guest_join(guestConnection, {
    body: {
      email,
      password,
      displayName,
      href,
      referrer,
    } satisfies ITodoAppGuest.IJoin,
  });
  // 4. Validate response structure
  typia.assert(result);
  // 5. Verify ID is non-empty (valid UUID format)
  TestValidator.equals("ID is non-empty", result.id.length > 0, true);
  // 6. Verify email matches input
  TestValidator.equals("Email matches input", result.email, email);
  // 7. Verify token structure exists
  typia.assert(result.token);
  TestValidator.predicate(
    "access token is present",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    result.token.refreshable_until.length > 0,
  );
  // 8. Verify expiration times are reasonable
  const now = new Date();
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  // Access token should expire within 15 minutes (900000 ms)
  const accessExpiryMs = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires within 15 minutes",
    accessExpiryMs > 0 && accessExpiryMs <= 900000,
  );
  // Refresh token should be valid for 7 days (604800000 ms)
  const refreshExpiryMs = refreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token expires within 7 days",
    refreshExpiryMs > 0 && refreshExpiryMs <= 604800000,
  );
  // Verify expiration order: access token expires before refresh token
  TestValidator.predicate(
    "access token expires before refresh token",
    expiredAt.getTime() < refreshableUntil.getTime(),
  );
  // 9. Verify account identity is established
  TestValidator.equals(
    "Account identity verified",
    result.email !== undefined,
    true,
  );
}
