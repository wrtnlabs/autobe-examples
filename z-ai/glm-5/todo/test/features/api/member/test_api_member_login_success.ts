import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login with valid credentials.
 *
 * Validates the complete authentication flow:
 * 1. Member registration via join endpoint
 * 2. Login with registered credentials
 * 3. Response validation with IAuthorized structure
 * 4. Token validity verification
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(registered);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IPrivateTodoAppMember.ILogin,
  });
  typia.assert(loggedIn);
  // Step 3: Verify member data matches
  TestValidator.equals("member id matches", loggedIn.id, registered.id);
  TestValidator.equals("email matches", loggedIn.email, email);
  TestValidator.equals(
    "display name matches",
    loggedIn.displayName,
    registered.displayName,
  );
  TestValidator.equals("deletedAt is null", loggedIn.deletedAt, null);
  // Step 4: Verify token structure
  TestValidator.predicate(
    "access token exists",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedIn.token.refresh.length > 0,
  );
  // Step 5: Verify token expiration timestamps
  const now = new Date();
  const expiredAt = new Date(loggedIn.token.expired_at);
  const refreshableUntil = new Date(loggedIn.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil > expiredAt,
  );
}
