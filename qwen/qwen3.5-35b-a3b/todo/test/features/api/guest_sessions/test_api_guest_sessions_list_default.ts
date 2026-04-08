import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list_default(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest user and authenticate - each auth creates a new session
  const guestConnections: api.IConnection[] = [];
  const guestAuths: IMultiUserTodoGuest.IAuthorized[] = [];
  // Create 3 guest sessions for testing pagination and sorting
  for (let i = 0; i < 3; i++) {
    const guestConnection: api.IConnection = { host: connection.host };
    const auth = await authorize_guest_join(guestConnection, {
      body: {
        email: `guest${i + 1}@test.com`,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoGuest.IJoin,
    });
    typia.assert(auth);
    guestConnections.push(guestConnection);
    guestAuths.push(auth);
  }
  // Use the most recent session for listing (it has the latest token)
  const listConnection: api.IConnection = { host: connection.host };
  listConnection.headers = {
    Authorization: guestAuths[2].token.access,
  };
  // Call the session listing endpoint with default parameters
  const response: IPageIMultiUserTodoMemberSession.ISummary =
    await api.functional.multiUserTodo.guest.sessions.index(listConnection, {
      body: {},
    });
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination records", response.pagination.records, 3);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // Validate that we have exactly 3 sessions
  TestValidator.equals("session count", response.data.length, 3);
  // Verify sessions are sorted by created_at descending (most recent first)
  for (let i = 1; i < response.data.length; i++) {
    const prevCreatedAt = new Date(response.data[i - 1].created_at).getTime();
    const currCreatedAt = new Date(response.data[i].created_at).getTime();
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      prevCreatedAt >= currCreatedAt,
    );
  }
  // Verify all sessions belong to the same guest (authenticated user)
  const guestMemberId = guestAuths[2].id;
  for (const session of response.data) {
    typia.assert(session);
    typia.assert(session.member);
    TestValidator.equals(
      "session belongs to authenticated guest",
      session.member.id,
      guestMemberId,
    );
  }
  // Verify each session has all required fields
  for (const session of response.data) {
    typia.assert(session);
    typia.assert(session.member);
    // Check member summary fields
    typia.assert(session.member.id);
    typia.assert(session.member.email);
    typia.assert(session.member.created_at);
    typia.assert(session.member.updated_at);
    typia.assert(session.member.deleted_at);
    // Check session fields
    typia.assert(session.ip);
    typia.assert(session.href);
    typia.assert(session.referrer);
    typia.assert(session.created_at);
    typia.assert(session.expired_at);
  }
}
