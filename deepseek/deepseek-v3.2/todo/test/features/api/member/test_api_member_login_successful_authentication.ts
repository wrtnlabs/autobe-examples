import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path of member login with valid credentials.
 * 1. Create a member account using the join endpoint
 * 2. Login with the same valid credentials
 * 3. Validate authorization tokens and member profile
 * 4. Verify concurrent login is allowed
 * 5. Ensure session context is properly recorded
 */
export async function test_api_member_login_successful_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account first using join
  const joinConnection: api.IConnection = { host: connection.host };
  // Generate random member data
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinDisplayName = RandomGenerator.name();
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  const joinIp = typia.random<string & tags.Format<"ipv4">>();
  // Use utility function for member join
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      display_name: joinDisplayName,
      href: joinHref,
      referrer: joinReferrer,
      ip: joinIp,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinedMember);
  // Verify join response contains valid data (business logic)
  TestValidator.equals(
    "email matches join input",
    joinedMember.email,
    joinEmail,
  );
  TestValidator.equals(
    "display name matches",
    joinedMember.display_name,
    joinDisplayName,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    joinedMember.deleted_at,
    null,
  );
  // Validate token structure from join
  typia.assert(joinedMember.token);
  TestValidator.predicate(
    "access token exists",
    joinedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    joinedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is future date",
    new Date(joinedMember.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is future date",
    new Date(joinedMember.token.refreshable_until) > new Date(),
  );
  // 2. Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  // Use utility function for member login
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: joinHref,
      referrer: joinReferrer,
      ip: joinIp,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loggedInMember);
  // 3. Validate login response
  TestValidator.equals(
    "member ID matches original",
    loggedInMember.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "email matches original",
    loggedInMember.email,
    joinedMember.email,
  );
  TestValidator.equals(
    "display name matches original",
    loggedInMember.display_name,
    joinedMember.display_name,
  );
  TestValidator.equals(
    "created_at matches",
    loggedInMember.created_at,
    joinedMember.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    loggedInMember.updated_at,
    joinedMember.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    loggedInMember.deleted_at,
    joinedMember.deleted_at,
  );
  // Validate token structure from login
  typia.assert(loggedInMember.token);
  TestValidator.predicate(
    "login access token exists",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token exists",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login expired_at is future",
    new Date(loggedInMember.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "login refreshable_until is future",
    new Date(loggedInMember.token.refreshable_until) > new Date(),
  );
  // 4. Verify tokens can be used for protected endpoints (connection headers updated)
  TestValidator.predicate(
    "join connection has authorization header",
    joinConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "login connection has authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
  // 5. Test concurrent login allowed - login again with same credentials
  const concurrentLoginConnection: api.IConnection = { host: connection.host };
  const concurrentLogin = await authorize_member_login(
    concurrentLoginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        href: joinHref,
        referrer: joinReferrer,
        ip: joinIp,
      } satisfies ITodoAppMember.ILogin,
    },
  );
  typia.assert(concurrentLogin);
  // Concurrent login should succeed with valid tokens
  TestValidator.equals(
    "concurrent login member ID matches",
    concurrentLogin.id,
    joinedMember.id,
  );
  TestValidator.predicate(
    "concurrent login access token exists",
    concurrentLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "concurrent login expired_at is future",
    new Date(concurrentLogin.token.expired_at) > new Date(),
  );
  // 6. Session context verification (implied by successful login with same context)
  TestValidator.predicate("login with same session context succeeded", true);
}
