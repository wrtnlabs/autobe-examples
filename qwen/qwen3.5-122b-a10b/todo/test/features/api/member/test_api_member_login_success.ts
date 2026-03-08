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
 * Test successful member login authentication workflow.
 *
 * 1. Register a new member account with valid credentials
 * 2. Login with the same credentials
 * 3. Verify login response contains valid tokens and member profile
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify login response contains valid member profile
  TestValidator.equals("member id matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinInput.email);
  TestValidator.equals(
    "display name matches",
    loginResult.displayName,
    joinInput.displayName,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    loginResult.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    loginResult.updatedAt !== null,
  );
  TestValidator.predicate(
    "deletedAt is null for active account",
    loginResult.deletedAt === null,
  );
  // 4. Verify JWT tokens are returned with valid structure
  TestValidator.predicate(
    "access token is not empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    loginResult.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    loginResult.token.refreshable_until !== null,
  );
}
