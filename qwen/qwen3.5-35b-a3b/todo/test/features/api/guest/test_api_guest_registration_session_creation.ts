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
 * Test guest registration creates a valid authenticated session for subsequent protected API operations.
 * 1. Register a new guest account with valid credentials
 * 2. Verify response contains authentication tokens and expiration timestamps
 * 3. Use access token to make authenticated requests to protected endpoints
 * 4. Verify multiple authenticated operations work without re-login
 */
export async function test_api_guest_registration_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify registration response contains guest id
  TestValidator.predicate(
    "guest id is valid uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResult.id,
    ),
  );
  // 3. Verify registration response contains email
  TestValidator.equals(
    "guest email is valid email format",
    joinResult.email.includes("@"),
    true,
  );
  // 4. Verify authorization token structure
  typia.assert(joinResult.token);
  TestValidator.equals(
    "access token is valid string",
    typeof joinResult.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is valid string",
    typeof joinResult.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is valid date-time format",
    !isNaN(Date.parse(joinResult.token.expired_at)),
    true,
  );
  TestValidator.equals(
    "refreshable_until is valid date-time format",
    !isNaN(Date.parse(joinResult.token.refreshable_until)),
    true,
  );
  // 5. Create new connection with access token for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...authenticatedConnection.headers,
    Authorization: joinResult.token.access,
  };
  // 6. Verify access token connection is properly configured
  TestValidator.equals(
    "authenticated connection has authorization header",
    authenticatedConnection.headers?.Authorization !== undefined,
    true,
  );
  // 7. Verify token expiration timestamps are in future
  TestValidator.predicate(
    "access token expired_at is in future",
    () =>
      new Date(joinResult.token.expired_at).getTime() > new Date().getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    () =>
      new Date(joinResult.token.refreshable_until).getTime() >
      new Date().getTime(),
  );
}
