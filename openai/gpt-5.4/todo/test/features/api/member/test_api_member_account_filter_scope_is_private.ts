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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_filter_scope_is_private(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(joined);
  const createdAtFrom = new Date(
    new Date(joined.created_at).getTime() - 60000,
  ).toISOString();
  const createdAtTo = new Date(
    new Date(joined.created_at).getTime() + 60000,
  ).toISOString();
  const updatedAtFrom = new Date(
    new Date(joined.updated_at).getTime() - 60000,
  ).toISOString();
  const updatedAtTo = new Date(
    new Date(joined.updated_at).getTime() + 60000,
  ).toISOString();
  const matchingRequest = {
    email: joined.email,
    email_verified: joined.email_verified,
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
    updated_at_from: updatedAtFrom,
    updated_at_to: updatedAtTo,
    deleted: false,
    page: 1,
    limit: 1,
    sort: "+created_at",
  } satisfies ITodoAppMember.IRequest;
  const matchingPage = await api.functional.todoApp.members.index(
    memberConnection,
    {
      body: matchingRequest,
    },
  );
  typia.assert(matchingPage);
  TestValidator.equals(
    "matching scope returns one record",
    matchingPage.data.length,
    1,
  );
  TestValidator.equals(
    "matching pagination reports one private record",
    matchingPage.pagination.records,
    1,
  );
  TestValidator.predicate(
    "matching page records stay within private scope",
    matchingPage.data.every((member) => member.id === joined.id),
  );
  TestValidator.predicate(
    "matching page exposes at most one private record",
    matchingPage.pagination.records <= 1,
  );
  TestValidator.equals(
    "matched member id",
    matchingPage.data[0]?.id,
    joined.id,
  );
  TestValidator.equals(
    "matched member email",
    matchingPage.data[0]?.email,
    joined.email,
  );
  TestValidator.equals(
    "matched member email verified",
    matchingPage.data[0]?.email_verified,
    joined.email_verified,
  );
  const excludingEmail = `excluded-${joined.email}` satisfies string as string;
  const excludingRequest = {
    email: excludingEmail,
    email_verified: joined.email_verified,
    deleted: false,
    page: 1,
    limit: 1,
    sort: "+created_at",
  } satisfies ITodoAppMember.IRequest;
  const excludingPage = await api.functional.todoApp.members.index(
    memberConnection,
    {
      body: excludingRequest,
    },
  );
  typia.assert(excludingPage);
  TestValidator.equals(
    "excluding filter returns no records",
    excludingPage.data.length,
    0,
  );
  TestValidator.predicate(
    "excluding page cannot widen visibility",
    excludingPage.pagination.records <= 1,
  );
  TestValidator.predicate(
    "excluding page contains no foreign member ids",
    excludingPage.data.every((member) => member.id === joined.id),
  );
}
