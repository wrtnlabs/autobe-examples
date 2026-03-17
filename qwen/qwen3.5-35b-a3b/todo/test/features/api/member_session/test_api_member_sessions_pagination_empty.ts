import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_pagination_empty(
  connection: api.IConnection,
): Promise<void> {
  // Test data for member join
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 1. Member joins with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IMultiUserTodoAppMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Member logs in to establish a session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: {
        email,
        password,
      } satisfies IMultiUserTodoAppMember.ILogin,
    });
  typia.assert(loginResult);
  // 3. Create connection for session listing using login token
  const sessionsConnection: api.IConnection = { host: connection.host };
  sessionsConnection.headers = {
    ...sessionsConnection.headers,
    Authorization: loginResult.token.access,
  };
  // 4. Request session listing with filter that returns no results
  // Set date range to a time period before the current session was created
  const farPastDate = new Date();
  farPastDate.setFullYear(farPastDate.getFullYear() - 10); // 10 years ago
  const startDate: string & tags.Format<"date-time"> =
    farPastDate.toISOString();
  const endDate: string & tags.Format<"date-time"> = farPastDate.toISOString();
  const filterBody: IMultiUserTodoAppMemberSession.IRequest = {
    startDate,
    endDate,
    page: 1,
    limit: 10,
  } satisfies IMultiUserTodoAppMemberSession.IRequest;
  const response: IPageIMultiUserTodoAppMemberSession =
    await api.functional.multiUserTodoApp.member.sessions.index(
      sessionsConnection,
      { body: filterBody },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  const pagination: IPage.IPagination = response.pagination;
  TestValidator.equals("pagination current", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 10);
  TestValidator.equals("pagination records", pagination.records, 0);
  TestValidator.equals("pagination pages", pagination.pages, 0);
  // 6. Validate data array is empty
  TestValidator.equals("data array empty", response.data.length, 0);
}
