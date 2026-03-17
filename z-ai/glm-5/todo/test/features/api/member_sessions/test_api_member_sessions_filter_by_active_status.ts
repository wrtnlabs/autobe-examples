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

export async function test_api_member_sessions_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Query active sessions (is_active: true)
  const activeResponse =
    await api.functional.privateTodoApp.member.sessions.index(
      memberConnection,
      {
        body: {
          is_active: true,
        } satisfies IPrivateTodoAppMemberSession.IRequest,
      },
    );
  typia.assert(activeResponse);
  // 3. Verify at least one active session exists (the one we just created)
  TestValidator.predicate(
    "at least one active session exists",
    activeResponse.data.length > 0,
  );
  // 4. Verify all active sessions have expired_at in the future
  const now = new Date();
  for (const session of activeResponse.data) {
    TestValidator.predicate(
      "active session has expired_at in the future",
      new Date(session.expired_at) > now,
    );
    // Privacy: verify session belongs to authenticated member
    TestValidator.equals(
      "session belongs to authenticated member",
      session.member.id,
      member.id,
    );
  }
  // 5. Query expired sessions (is_active: false)
  const expiredResponse =
    await api.functional.privateTodoApp.member.sessions.index(
      memberConnection,
      {
        body: {
          is_active: false,
        } satisfies IPrivateTodoAppMemberSession.IRequest,
      },
    );
  typia.assert(expiredResponse);
  // 6. Verify all expired sessions have expired_at in the past or equal to now
  for (const session of expiredResponse.data) {
    TestValidator.predicate(
      "expired session has expired_at in the past",
      new Date(session.expired_at) <= now,
    );
    // Privacy: verify session belongs to authenticated member
    TestValidator.equals(
      "session belongs to authenticated member",
      session.member.id,
      member.id,
    );
  }
}
