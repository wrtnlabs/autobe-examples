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
 * Test successful member authentication via login endpoint.
 *
 * Validates the complete member login flow by first registering a new member account and then authenticating with the provided credentials. Confirms that the response contains expected member identity fields, valid JWT access and refresh tokens, and correct expiration timestamps.
 *
 * The test verifies that an active (non-deleted) member can successfully authenticate with their registered email and password, and that the authorization response includes all required identity and token fields.
 *
 * 1. Register a new member account with unique email and password.
 * 2. Login with the registered credentials to establish an active session.
 * 3. Validate the IAuthorized response contains member identity and token data.
 * 4. Confirm token expiration timestamps are valid future dates.
 * 5. Verify deleted_at is null indicating active account status.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const loginEmail = typia.random<string & tags.Format<"email">>();
  const loginPassword = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email: loginEmail,
    password: loginPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMember.IJoin;
  const joinResponse = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joinResponse);
  // 2. Login with the same registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: loginEmail,
    password: loginPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMember.ILogin;
  const loginResponse = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResponse);
  // 3. Validate response contains correct member identity
  TestValidator.equals(
    "email matches registered email",
    loginResponse.email,
    loginEmail,
  );
  TestValidator.predicate(
    "access token is non-empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResponse.token.refresh.length > 0,
  );
  // 4. Confirm token expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(loginResponse.token.expired_at).getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token valid until is in the future",
    new Date(loginResponse.token.refreshable_until).getTime() > now.getTime(),
  );
  // 5. Verify account is active (not deleted)
  TestValidator.equals(
    "account is active (not deleted)",
    loginResponse.deleted_at,
    null,
  );
}
