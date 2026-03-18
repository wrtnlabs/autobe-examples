import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_password_reset_record_lookup(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    {
      passwordResetId,
    },
  );
  typia.assert(output);
  TestValidator.equals("password reset id", output.id, passwordResetId);
  TestValidator.equals(
    "password reset member id exists",
    output.member.id.length > 0,
    true,
  );
  TestValidator.equals(
    "password reset member email exists",
    output.member.email.length > 0,
    true,
  );
  TestValidator.equals(
    "password reset token exists",
    output.token.length > 0,
    true,
  );
  TestValidator.predicate(
    "password reset timestamps are ordered",
    () =>
      new Date(output.created_at).getTime() <=
      new Date(output.expired_at).getTime(),
  );
  TestValidator.predicate(
    "password reset used_at is nullable timestamp or null",
    () => output.used_at === null || new Date(output.used_at).getTime() >= 0,
  );
}
