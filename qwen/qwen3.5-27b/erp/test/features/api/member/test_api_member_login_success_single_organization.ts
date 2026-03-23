import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login when the user belongs to a single organization.
 *
 * This test verifies the complete member authentication flow:
 * 1. Creates a new member account with unique credentials
 * 2. Logs in with the registered credentials
 * 3. Validates the authentication response structure
 * 4. Confirms the session is properly established
 */
export async function test_api_member_login_success_single_organization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // Verify join response structure
  TestValidator.equals(
    "join returns valid member ID",
    joinResult.id,
    joinResult.id,
  );
  TestValidator.equals("join returns valid email", joinResult.email, joinEmail);
  TestValidator.predicate(
    "member is not deleted",
    joinResult.deleted_at === null,
  );
  TestValidator.predicate(
    "access token is present",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    joinResult.token.refresh.length > 0,
  );
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // Verify login response structure
  TestValidator.equals(
    "login returns same member ID",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "login returns same email",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.predicate(
    "member is not deleted after login",
    loginResult.deleted_at === null,
  );
  TestValidator.predicate(
    "login access token is present",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token is present",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is valid",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh deadline is valid",
    loginResult.token.refreshable_until.length > 0,
  );
  // Step 3: Verify the access token is set in connection headers
  TestValidator.predicate(
    "Authorization header is set after login",
    loginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    loginConnection.headers?.Authorization,
    loginResult.token.access,
  );
  // Step 4: Verify session timestamps are valid
  TestValidator.predicate(
    "created_at is valid datetime",
    loginResult.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    loginResult.updated_at.length > 0,
  );
}
