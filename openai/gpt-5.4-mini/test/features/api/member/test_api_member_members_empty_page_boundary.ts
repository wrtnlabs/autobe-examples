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

export async function test_api_member_members_empty_page_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com`,
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  const firstPage = await api.functional.todoApp.member.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
        sort: "created_at",
        order: "asc",
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(firstPage);
  const boundaryPage: number =
    firstPage.pagination.pages + 1 > 1 ? firstPage.pagination.pages + 1 : 2;
  const emptyPage = await api.functional.todoApp.member.members.index(
    memberConnection,
    {
      body: {
        page: boundaryPage,
        limit: 1,
        sort: "created_at",
        order: "asc",
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty page records consistency",
    emptyPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "empty page limit consistency",
    emptyPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "empty page current boundary",
    emptyPage.pagination.current,
    boundaryPage,
  );
  TestValidator.predicate(
    "empty page pagination is internally consistent",
    emptyPage.pagination.pages >= 0 && emptyPage.pagination.records >= 0,
  );
}
