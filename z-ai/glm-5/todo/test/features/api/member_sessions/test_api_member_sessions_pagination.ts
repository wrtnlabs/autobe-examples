import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppMemberSession";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Call PATCH /privateTodoApp/member/sessions with page=1, limit=10
  const page1 = await api.functional.privateTodoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IPrivateTodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has records", page1.pagination.records >= 1);
  TestValidator.predicate("page 1 data not empty", page1.data.length >= 1);
  // 4. Validate total pages calculation
  const expectedPages = Math.ceil(
    page1.pagination.records / page1.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation",
    page1.pagination.pages,
    expectedPages,
  );
  // 5. Call with page=2, limit=10 - expect empty data
  const page2 = await api.functional.privateTodoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IPrivateTodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 records same",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 data empty for new account",
    page2.data.length,
    0,
  );
  // 6. Test boundary with limit=1
  const singlePage = await api.functional.privateTodoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IPrivateTodoAppMemberSession.IRequest,
    },
  );
  typia.assert(singlePage);
  TestValidator.equals("single page current", singlePage.pagination.current, 1);
  TestValidator.equals("single page limit", singlePage.pagination.limit, 1);
  TestValidator.predicate(
    "single page has 1 item max",
    singlePage.data.length <= 1,
  );
  // Validate total pages with limit=1
  const expectedSinglePages = Math.ceil(singlePage.pagination.records / 1);
  TestValidator.equals(
    "single page total pages",
    singlePage.pagination.pages,
    expectedSinglePages,
  );
  // 7. Verify sessions are sorted by created_at DESC
  if (page1.data.length >= 2) {
    const dates = page1.data.map((s) => new Date(s.created_at).getTime());
    const isSortedDesc = dates.every(
      (date, i) => i === 0 || dates[i - 1] >= date,
    );
    TestValidator.predicate("sessions sorted by created_at DESC", isSortedDesc);
  }
}
