import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ITodoAppMember.ILogin;
  const output = await api.functional.todoApp.auth.member.login(connection, {
    body: loginBody,
  });
  typia.assert(output);
  TestValidator.equals(
    "email should match login input",
    output.email,
    loginBody.email,
  );
  TestValidator.equals(
    "deleted_at should be null for active member",
    output.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token should be present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be present",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be present",
    output.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "login response should not expose password fields",
    !("password" in output) && !("password_hash" in output),
  );
}
