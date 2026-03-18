import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_current_account_missing_record_safe_failure(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: true,
  } satisfies ITodoAppMember.IJoin;
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorized);
  const current =
    await api.functional.todoApp.member.members.at(memberConnection);
  typia.assert(current);
  TestValidator.equals(
    "current member id should match the authenticated session",
    current.id,
    authorized.id,
  );
  TestValidator.equals(
    "current member email should match the authenticated session",
    current.email,
    authorized.email,
  );
  TestValidator.equals(
    "current member deleted_at should match the authenticated session",
    current.deleted_at,
    authorized.deleted_at,
  );
}
