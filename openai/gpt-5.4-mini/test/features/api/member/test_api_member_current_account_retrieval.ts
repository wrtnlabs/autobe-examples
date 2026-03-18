import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_current_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  const current =
    await api.functional.todoApp.member.members.at(memberConnection);
  typia.assert(current);
  TestValidator.equals(
    "member id should match authenticated join account",
    current.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should match authenticated join account",
    current.email,
    joined.email,
  );
  TestValidator.equals(
    "deleted_at should be null for an active account",
    current.deleted_at,
    null,
  );
  TestValidator.equals(
    "created_at should match authenticated join account",
    current.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "updated_at should match authenticated join account",
    current.updated_at,
    joined.updated_at,
  );
}
