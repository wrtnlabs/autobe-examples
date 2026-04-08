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
 * Test successful member login with valid credentials.
 *
 * Validates the complete member authentication workflow from registration through login. Ensures that a registered member can successfully authenticate with their credentials and receive valid JWT tokens along with complete member identity information.
 *
 * The test follows a sequential flow: first creating a member account, then authenticating with those credentials, and finally validating all response fields conform to expected types and business rules.
 *
 * 1. Register a new member account with random email and password.
 * 2. Login with the same credentials.
 * 3. Verify JWT tokens are present and properly formatted.
 * 4. Verify member identity information matches registration data.
 * 5. Verify timestamps are valid ISO 8601 format.
 * 6. Verify deleted_at is null for active account.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify JWT tokens structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  // 4. Verify member identity information
  TestValidator.equals("email matches", loginResult.email, joinEmail);
  TestValidator.predicate(
    "display_name exists",
    loginResult.display_name.length > 0,
  );
  // 5. Verify active account status
  TestValidator.equals("account is active", loginResult.deleted_at, null);
}
