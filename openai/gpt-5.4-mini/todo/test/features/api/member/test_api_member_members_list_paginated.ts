import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_members_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = true;
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  const request = {
    search: email,
    page: 1,
    limit: 10,
    sort: RandomGenerator.pick(["created_at", "updated_at"] as const),
    order: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies ITodoAppMember.IRequest;
  const output = await api.functional.todoApp.member.members.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should match the request",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match the request",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data should be an array of member summaries",
    Array.isArray(output.data),
  );
  for (const summary of output.data) typia.assert(summary);
}
