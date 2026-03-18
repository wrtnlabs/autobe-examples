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

export async function test_api_member_members_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const searchSeed: string = RandomGenerator.alphabets(8);
  const createdMembers = await ArrayUtil.asyncRepeat(4, async (index) => {
    const joined = await api.functional.todoApp.auth.member.join(
      actorConnection,
      {
        body: {
          email:
            `member-search-sort-${searchSeed}-${index}@example.com` as string,
          password: true,
        } satisfies ITodoAppMember.IJoin,
      },
    );
    typia.assert(joined);
    return joined;
  });
  const searchRequest: ITodoAppMember.IRequest = {
    search: searchSeed,
    page: 1,
    limit: 10,
    sort: "created_at",
    order: "asc",
  };
  const searchOutput = await api.functional.todoApp.member.members.index(
    actorConnection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchOutput);
  TestValidator.equals(
    "pagination current page",
    searchOutput.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchOutput.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    searchOutput.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    searchOutput.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "search result size respects limit",
    searchOutput.data.length <= searchRequest.limit!,
  );
  TestValidator.predicate(
    "all search results match the search seed",
    searchOutput.data.every((member) => member.email.includes(searchSeed)),
  );
  TestValidator.predicate(
    "search results expose only summary fields",
    searchOutput.data.every(
      (member) =>
        typeof member.id === "string" &&
        typeof member.email === "string" &&
        typeof member.created_at === "string" &&
        typeof member.updated_at === "string" &&
        (member.deleted_at === null || typeof member.deleted_at === "string"),
    ),
  );
  const createdAsc = await api.functional.todoApp.member.members.index(
    actorConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        order: "asc",
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(createdAsc);
  const createdAscTimes = createdAsc.data.map((member) =>
    new Date(member.created_at).getTime(),
  );
  TestValidator.predicate(
    "created_at ascending order is monotonic",
    createdAscTimes.every(
      (value, index, array) => index === 0 || array[index - 1] <= value,
    ),
  );
  const createdDesc = await api.functional.todoApp.member.members.index(
    actorConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        order: "desc",
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(createdDesc);
  const createdDescTimes = createdDesc.data.map((member) =>
    new Date(member.created_at).getTime(),
  );
  TestValidator.predicate(
    "created_at descending order is monotonic",
    createdDescTimes.every(
      (value, index, array) => index === 0 || array[index - 1] >= value,
    ),
  );
  const updatedAsc = await api.functional.todoApp.member.members.index(
    actorConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "updated_at",
        order: "asc",
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(updatedAsc);
  const updatedAscTimes = updatedAsc.data.map((member) =>
    new Date(member.updated_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at ascending order is monotonic",
    updatedAscTimes.every(
      (value, index, array) => index === 0 || array[index - 1] <= value,
    ),
  );
  const updatedDesc = await api.functional.todoApp.member.members.index(
    actorConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "updated_at",
        order: "desc",
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(updatedDesc);
  const updatedDescTimes = updatedDesc.data.map((member) =>
    new Date(member.updated_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at descending order is monotonic",
    updatedDescTimes.every(
      (value, index, array) => index === 0 || array[index - 1] >= value,
    ),
  );
  TestValidator.predicate(
    "created test members are present in the member list",
    createdMembers.every(
      (member) =>
        createdAsc.data.some((item) => item.id === member.id) ||
        createdDesc.data.some((item) => item.id === member.id),
    ),
  );
}
