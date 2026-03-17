import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_account_access_denied_when_signed_out(
  connection: api.IConnection,
): Promise<void> {
  const signedOutConnection: api.IConnection = {
    host: connection.host,
  };
  const request = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    created_at_from: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    created_at_to: new Date().toISOString(),
    updated_at_from: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updated_at_to: new Date().toISOString(),
    deleted: false,
    page: 1,
    limit: 1,
    sort: "-created_at",
  } satisfies ITodoAppMember.IRequest;
  await TestValidator.httpError(
    "signed-out member account access is rejected without leaking private account data",
    [401, 403],
    async () => {
      await api.functional.todoApp.members.index(signedOutConnection, {
        body: request,
      });
    },
  );
}
