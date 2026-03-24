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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_resets_get_active_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const join: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(join);
  // Best-effort active reset record id.
  // (No reset-token creation/listing API is provided in the available SDK.)
  const resetId = join.id;
  const reset1 = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    { resetId },
  );
  typia.assert(reset1);
  TestValidator.equals("resetId matches", reset1.id, resetId);
  TestValidator.predicate("token is non-empty", reset1.token.length > 0);
  TestValidator.predicate(
    "expires_at is not in the past",
    new Date(reset1.expires_at).getTime() >= Date.now() - 5000,
  );
  TestValidator.equals("used_at is null", reset1.used_at, null);
  TestValidator.equals("deleted_at is null", reset1.deleted_at, null);
  const expectedKeys = [
    "id",
    "token",
    "expires_at",
    "used_at",
    "created_at",
    "updated_at",
    "deleted_at",
    "todo_app_member_id",
  ] as const;
  const actualKeys = Object.keys(reset1).sort();
  const expKeys = expectedKeys.slice().sort();
  TestValidator.equals("response fields match DTO", actualKeys, expKeys);
  const reset2 = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    { resetId },
  );
  typia.assert(reset2);
  TestValidator.equals("used_at unchanged", reset2.used_at, reset1.used_at);
  TestValidator.equals(
    "deleted_at unchanged",
    reset2.deleted_at,
    reset1.deleted_at,
  );
  TestValidator.equals("token unchanged", reset2.token, reset1.token);
  TestValidator.equals(
    "expires_at unchanged",
    reset2.expires_at,
    reset1.expires_at,
  );
}
