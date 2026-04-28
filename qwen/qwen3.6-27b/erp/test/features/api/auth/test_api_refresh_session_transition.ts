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

export async function test_api_refresh_session_transition(
  connection: api.IConnection,
): Promise<void> {
  // Prepare member identity for the test lifecycle
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const displayName: string = RandomGenerator.name();
  const href: string = typia.random<string & tags.Format<"uri">>();
  const referrer: string = typia.random<string & tags.Format<"uri">>();
  // === Step 1: Join - Register member to get initial tokens ===
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email,
        password,
        display_name: displayName,
        href,
        referrer,
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(joined);
  // Verify join response has valid identity
  TestValidator.equals(
    "join member id is valid UUID",
    typeof joined.id,
    "string",
  );
  TestValidator.equals("join email matches", joined.email, email);
  TestValidator.equals(
    "join display_name matches",
    joined.display_name,
    displayName,
  );
  TestValidator.predicate(
    "join token exists",
    joined.token.access != null && joined.token.refresh != null,
  );
  // Capture join identity for later comparison
  const joinId = joined.id;
  const joinEmail = joined.email;
  const joinDisplayName = joined.display_name;
  // === Step 2: Login - Fresh session to get new tokens ===
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn: IHrmPlatformMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IHrmPlatformMember.ILogin,
    },
  );
  typia.assert(loggedIn);
  // Verify login returns IAuthorized with new tokens
  TestValidator.equals(
    "login member id is valid UUID",
    typeof loggedIn.id,
    "string",
  );
  TestValidator.equals(
    "login email matches join email",
    loggedIn.email,
    joinEmail,
  );
  TestValidator.equals(
    "login display_name matches join display_name",
    loggedIn.display_name,
    joinDisplayName,
  );
  TestValidator.equals("login id matches join id", loggedIn.id, joinId);
  TestValidator.predicate(
    "login token exists",
    loggedIn.token.access != null && loggedIn.token.refresh != null,
  );
  // Capture login refresh token for step 3
  const loginRefreshToken: string = loggedIn.token.refresh;
  // === Step 3: Refresh - Get another new token pair using login's refresh token ===
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: IHrmPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: loginRefreshToken,
      } satisfies IHrmPlatformMember.IRefresh,
    });
  typia.assert(refreshed);
  // Verify refresh returns IAuthorized with new tokens
  TestValidator.equals(
    "refresh member id is valid UUID",
    typeof refreshed.id,
    "string",
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshed.token.access != null && refreshed.token.refresh != null,
  );
  // === Step 4: Identity Preservation Verification ===
  // Verify that member identity is preserved across the entire refresh cycle
  TestValidator.equals(
    "refresh id matches join id (identity preserved across cycle)",
    refreshed.id,
    joinId,
  );
  TestValidator.equals(
    "refresh email matches join email (identity preserved across cycle)",
    refreshed.email,
    joinEmail,
  );
  TestValidator.equals(
    "refresh display_name matches join display_name (identity preserved across cycle)",
    refreshed.display_name,
    joinDisplayName,
  );
  // Verify identity consistency between login and refresh
  TestValidator.equals(
    "refresh id matches login id",
    refreshed.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "refresh email matches login email",
    refreshed.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "refresh display_name matches login display_name",
    refreshed.display_name,
    loggedIn.display_name,
  );
  // Verify tokens are different after each step (new tokens issued)
  TestValidator.notEquals(
    "refresh access token differs from login access token (new token issued)",
    refreshed.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "refresh refresh_token differs from login refresh_token (new token issued)",
    refreshed.token.refresh,
    loginRefreshToken,
  );
}
