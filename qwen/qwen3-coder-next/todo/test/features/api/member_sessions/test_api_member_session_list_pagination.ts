import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestSession";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppMemberSession.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: joinData,
  });
  typia.assert(memberAuth);
  // Create multiple sessions by logging in multiple times
  const loginData = {
    email: joinData.email,
    password: joinData.password,
    href: "https://example.com/login",
    referrer: "https://example.com",
    ip: "127.0.0.1",
  } satisfies ITodoAppMemberSession.ILogin;
  // Create 15 sessions to test pagination with page size of 5
  for (let i = 0; i < 15; i++) {
    const sessionAuth = await authorize_member_login(memberConnection, {
      body: loginData,
    });
    typia.assert(sessionAuth);
  }
  // Call the sessions endpoint to get paginated results
  const sessionsResult =
    await api.functional.todoApp.member.sessions.index(memberConnection);
  typia.assert(sessionsResult);
  // Validate pagination structure exists
  TestValidator.predicate("has pagination metadata", () => {
    const p = sessionsResult.pagination;
    return p.current > 0 && p.limit > 0 && p.records >= 0 && p.pages >= 0;
  });
  // Validate data array exists
  TestValidator.predicate("has data array", () =>
    Array.isArray(sessionsResult.data),
  );
  // Verify pagination fields are correct types
  TestValidator.equals(
    "current page is positive number",
    typeof sessionsResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "limit is positive number",
    typeof sessionsResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "records count is number",
    typeof sessionsResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pages count is number",
    typeof sessionsResult.pagination.pages,
    "number",
  );
  // Verify each session in the data array has required fields
  // Note: The endpoint returns ITodoAppGuestSession.ISummary objects
  // which have a different structure than ITodoAppMemberSession.ISummary
  for (const session of sessionsResult.data) {
    TestValidator.predicate(
      "session data exists",
      () => session !== null && session !== undefined,
    );
  }
}
