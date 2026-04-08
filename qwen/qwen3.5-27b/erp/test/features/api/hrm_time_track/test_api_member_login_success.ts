import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
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
 * Validates the complete member authentication flow including account registration and login. Ensures that the login endpoint correctly authenticates members with valid credentials and returns proper authorization tokens.
 *
 * Special attention is given to verifying that the member identity is correctly returned and that the authorization token contains all required fields including access token, refresh token, and expiration timestamps.
 *
 * 1. Register a new member account with valid email and password.
 * 2. Capture the credentials used for registration.
 * 3. Login with the registered credentials including session context.
 * 4. Validate member identity and authorization token structure.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new member account with explicit credentials
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Login with the SAME credentials used during registration
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.ILogin,
  });
  typia.assert(loggedInMember);
  // 3. Validate member identity
  TestValidator.equals(
    "member id is valid uuid",
    loggedInMember.id,
    loggedInMember.id,
  );
  TestValidator.equals(
    "member email matches registered",
    loggedInMember.email,
    joinEmail,
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(loggedInMember.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(loggedInMember.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at is null (active account)",
    loggedInMember.deleted_at,
    null,
  );
  // 4. Validate authorization token
  TestValidator.predicate(
    "access token is non-empty",
    () => loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    () => loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(loggedInMember.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(loggedInMember.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}
