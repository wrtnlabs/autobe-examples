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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare credentials first (password must be reused for login)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // 2. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(registeredMember);
  // 3. Prepare login credentials with the same email and password
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.ILogin;
  // 4. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedInMember);
  // 5. Validate response matches expected values
  TestValidator.equals(
    "member id matches",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals("email matches", loggedInMember.email, email);
  TestValidator.equals(
    "displayName matches",
    loggedInMember.displayName,
    displayName,
  );
  TestValidator.predicate(
    "createdAt is valid",
    new Date(loggedInMember.createdAt) <= new Date(),
  );
  TestValidator.predicate(
    "updatedAt is valid",
    new Date(loggedInMember.updatedAt) <= new Date(),
  );
  TestValidator.predicate(
    "access token exists",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is future",
    new Date(loggedInMember.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is future",
    new Date(loggedInMember.token.refreshable_until) > new Date(),
  );
}
