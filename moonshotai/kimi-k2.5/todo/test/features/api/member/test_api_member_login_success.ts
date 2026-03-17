import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
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
 * 1. First create a member account via join endpoint with generated credentials
 * 2. Create a fresh connection for login testing
 * 3. Call login endpoint with the same credentials
 * 4. Validate the response contains member info and valid authorization tokens
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for the new member
  const email = typia.random<
    string & tags.MinLength<1> & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  // Create a connection for joining the member
  const joinConnection: api.IConnection = { host: connection.host };
  // Create member account using the join utility
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinedMember);
  // Create a new connection for login (isolated per Connection Isolation Pattern)
  const loginConnection: api.IConnection = { host: connection.host };
  // Login with the credentials using the login utility
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(loggedInMember);
  // Validate business logic: email matches the input credentials
  TestValidator.equals("email matches input", loggedInMember.email, email);
  // Validate tokens are non-empty (business logic beyond type checking)
  TestValidator.predicate(
    "access token is non-empty",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedInMember.token.refresh.length > 0,
  );
}
