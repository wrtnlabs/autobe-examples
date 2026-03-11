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
 * Test successful member login authentication.
 *
 * This test validates the complete member authentication flow:
 * 1. Register a new member account with valid credentials
 * 2. Login using the registered email and password
 * 3. Verify the authentication response contains matching member identity
 * 4. Confirm tokens are issued for the authenticated session
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinDisplayName = RandomGenerator.name();
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      displayName: joinDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate login returns matching member identity
  TestValidator.equals("member id matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinEmail);
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    joinDisplayName,
  );
}
