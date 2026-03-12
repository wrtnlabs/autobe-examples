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
  // 1. Prepare registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name();
  // 2. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResult);
  // 3. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate response structure and business logic
  TestValidator.equals("email matches", loginResult.email, email);
  TestValidator.predicate("account is active", loginResult.deleted_at === null);
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate("has member id", loginResult.id.length > 0);
  TestValidator.predicate(
    "has display name",
    loginResult.display_name.length > 0,
  );
}
