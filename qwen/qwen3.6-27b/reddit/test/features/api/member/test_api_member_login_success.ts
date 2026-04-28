import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login with valid credentials after successful registration.
 *
 * Validates the complete member authentication workflow: a new member registers via the join endpoint with unique email, password, and username, then successfully authenticates using those same credentials. Upon successful login, the system returns JWT access and refresh tokens alongside the member's identity and profile information.
 *
 * Verifies that the authenticated response includes valid tokens with expiration metadata, member identity matches the registered account, and default profile fields (display_name, bio, karma) are correctly initialized for new members.
 *
 * 1. Register a new member with randomized email, password, and username.
 * 2. Authenticate the member using the same email and password credentials.
 * 3. Validate login response contains structured JWT tokens, matching member identity, and correct default profile values.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with randomized credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  const joinAuthorized = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      username,
    },
  });
  typia.assert(joinAuthorized);
  TestValidator.equals("join email matches", joinAuthorized.email, email);
  TestValidator.equals(
    "join username matches",
    joinAuthorized.username,
    username,
  );
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies IREdditLikeCommunityMember.ILogin;
  const loginAuthorized = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginAuthorized);
  // 3. Validate login response
  TestValidator.equals(
    "member id consistent",
    loginAuthorized.id,
    joinAuthorized.id,
  );
  TestValidator.equals(
    "email matches registered",
    loginAuthorized.email,
    email,
  );
  TestValidator.equals(
    "username matches registered",
    loginAuthorized.username,
    username,
  );
  TestValidator.equals(
    "display name defaults to null",
    loginAuthorized.display_name,
    null,
  );
  TestValidator.equals("bio defaults to null", loginAuthorized.bio, null);
  TestValidator.equals("karma defaults to zero", loginAuthorized.karma, 0);
  TestValidator.predicate(
    "access token exists",
    loginAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginAuthorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expires_at present",
    loginAuthorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until present",
    loginAuthorized.token.refreshable_until.length > 0,
  );
}
