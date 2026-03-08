import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account (creates initial session)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Test first page (page=1) with limit=10
  const firstPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has correct current",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page has correct limit",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page has at least 1 session",
    firstPage.data.length >= 1,
  );
  TestValidator.predicate(
    "first page total records >= 1",
    firstPage.pagination.records >= 1,
  );
  // 3. Test second page (page=2) with limit=10 - should return empty when no more sessions
  const secondPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page has correct current",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has correct limit",
    secondPage.pagination.limit,
    10,
  );
  TestValidator.equals("second page has empty data", secondPage.data.length, 0);
  // 4. Test page beyond available pages (page=999)
  const beyondPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 999,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page has empty data", beyondPage.data.length, 0);
  TestValidator.predicate(
    "beyond page pagination exists",
    beyondPage.pagination.pages >= 0,
  );
  // 5. Test invalid page number (page=0) - should be handled
  await TestValidator.error("page=0 should fail validation", async () => {
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        page: 0,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  });
  // 6. Test invalid limit (limit=0) - should be handled
  await TestValidator.error("limit=0 should fail validation", async () => {
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        page: 1,
        limit: 0,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  });
  // 7. Test invalid limit (limit>100) - should be handled
  await TestValidator.error("limit>100 should fail validation", async () => {
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        page: 1,
        limit: 101,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  });
  // 8. Test maximum limit (limit=100) works correctly
  const maxLimitPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page has correct limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page has valid records",
    maxLimitPage.pagination.records >= 1,
  );
  // 9. Verify sorting consistency - first session should have latest created_at
  if (firstPage.data.length > 0 && maxLimitPage.data.length > 0) {
    TestValidator.predicate(
      "sorting is consistent - first session created_at matches",
      firstPage.data[0].created_at === maxLimitPage.data[0].created_at,
    );
  }
  // 10. Test pagination metadata accuracy
  TestValidator.predicate(
    "pagination pages calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
}
