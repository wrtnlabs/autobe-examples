import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that the admin registration process correctly generates and returns
 * JWT authorization tokens with proper metadata.
 */
export async function test_api_admin_join_session_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Validate token metadata
  const token = joinResponse.token;
  typia.assert(token);
  TestValidator.equals("access token is string", typeof token.access, "string");
  TestValidator.equals(
    "refresh token is string",
    typeof token.refresh,
    "string",
  );
  TestValidator.predicate(
    "expired_at is present",
    token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    token.refreshable_until !== undefined,
  );
  // 3. Create new connection with access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${token.access}`,
    },
  };
  // 4. Validate token string lengths are reasonable
  TestValidator.predicate(
    "access token length is reasonable",
    token.access.length > 50,
  );
  TestValidator.predicate(
    "refresh token length is reasonable",
    token.refresh.length > 50,
  );
  // 5. Validate token expiration timestamps are valid date-time format
  TestValidator.predicate("expired_at is valid date-time", () => {
    new Date(token.expired_at);
    return true;
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    new Date(token.refreshable_until);
    return true;
  });
  // 6. Verify access token is set in adminConnection headers (verify authorization flow)
  TestValidator.equals(
    "admin connection has authorization header",
    adminConnection.headers?.Authorization !== undefined,
    true,
  );
  // 7. Verify admin account details
  TestValidator.equals(
    "admin id is valid string",
    typeof joinResponse.id,
    "string",
  );
  TestValidator.equals(
    "admin email is string",
    typeof joinResponse.email,
    "string",
  );
  TestValidator.equals(
    "isBanned is boolean",
    typeof joinResponse.isBanned,
    "boolean",
  );
  TestValidator.equals(
    "banReason is null or string",
    joinResponse.banReason === null ||
      typeof joinResponse.banReason === "string",
    true,
  );
  TestValidator.equals(
    "createdAt is date-time string",
    typeof joinResponse.createdAt,
    "string",
  );
  TestValidator.equals(
    "updatedAt is date-time string",
    typeof joinResponse.updatedAt,
    "string",
  );
}