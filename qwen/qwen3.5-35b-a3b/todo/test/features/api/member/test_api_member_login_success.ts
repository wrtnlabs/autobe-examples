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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoMember.IJoin;
  const joinResult = await authorize_member_join(joinConnection, {
    body: memberCredentials,
  });
  typia.assert(joinResult);
  // 2. Login with the created member credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: memberCredentials.email,
      password: memberCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate response structure
  TestValidator.equals(
    "email matches",
    loginResult.email,
    memberCredentials.email,
  );
  TestValidator.equals("deleted_at is null", loginResult.deleted_at, null);
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResult.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginResult.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginResult.updated_at),
  );
  // 4. Validate token structure
  const token = loginResult.token;
  typia.assert(token);
  TestValidator.equals("access token exists", token.access.length > 0, true);
  TestValidator.equals("refresh token exists", token.refresh.length > 0, true);
  TestValidator.predicate(
    "access expired_at is valid",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );
  // 5. Validate expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "access expired_at is in future",
    new Date(token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(token.refreshable_until) > now,
  );
}
