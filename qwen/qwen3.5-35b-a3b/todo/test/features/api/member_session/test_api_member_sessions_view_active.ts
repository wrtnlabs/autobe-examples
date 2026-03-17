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

/**
 * Test member can view their active authentication sessions.
 * This endpoint retrieves a paginated list of all login sessions across different devices for the authenticated user.
 */
export async function test_api_member_sessions_view_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member to create account and initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(joinResult);

  // 2. Create actor-specific connection from the join response token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: joinResult.token.access,
  };

  // 3. Request to view sessions with no filters (default pagination)
  const sessions: IPageIMultiUserTodoAppMemberSession =
    await api.functional.multiUserTodoApp.member.sessions.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(sessions);

  // 4. Verify pagination metadata structure and default values
  TestValidator.equals(
    "pagination current is 1",
    sessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    sessions.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    sessions.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    sessions.pagination.pages >= 1,
  );

  // 5. Verify data array contains at least one session record
  TestValidator.predicate(
    "sessions data array has at least one item",
    sessions.data.length >= 1,
  );

  // 6. Verify session record has required fields (typia.assert validates this)
  const firstSession = sessions.data[0];
  typia.assert(firstSession);

  // 7. Verify session's member_id matches authenticated member's ID
  TestValidator.equals(
    "session member_id matches authenticated user",
    firstSession.multi_user_todo_app_member_id,
    joinResult.id,
  );
}