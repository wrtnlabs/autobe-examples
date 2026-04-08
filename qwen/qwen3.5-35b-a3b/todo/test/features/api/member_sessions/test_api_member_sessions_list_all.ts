import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Define the join password before using it
  const joinPassword = RandomGenerator.alphaNumeric(16);
  // Create member account and authenticate to establish a session
  const joinConnection: api.IConnection = { host: connection.host };
  const authenticatedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authenticatedMember);
  // Create a session-specific connection for listing sessions
  const sessionConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(sessionConnection, {
    body: {
      email: authenticatedMember.email,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // List member sessions with default pagination and sorting
  const sessionsResponse =
    await api.functional.multiUserTodo.member_sessions.index(
      sessionConnection,
      {
        body: {},
      },
    );
  typia.assert(sessionsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    sessionsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has at least one record",
    sessionsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has at least one page",
    sessionsResponse.pagination.pages >= 1,
  );
  // Validate session list contains at least one session
  TestValidator.predicate(
    "session list has at least one entry",
    sessionsResponse.data.length >= 1,
  );
  // Validate first session structure and data
  const firstSession = sessionsResponse.data[0];
  // Validate session has UUID id
  TestValidator.predicate(
    "session id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(firstSession.id),
  );
  // Validate member info in session
  TestValidator.equals(
    "member id matches authenticated member",
    firstSession.member.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    firstSession.member.email,
    authenticatedMember.email,
  );
  TestValidator.predicate(
    "member created_at is valid datetime",
    new Date(firstSession.member.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "member updated_at is valid datetime",
    new Date(firstSession.member.updated_at) instanceof Date,
  );
  TestValidator.equals(
    "member deleted_at is null for active member",
    firstSession.member.deleted_at,
    null,
  );
  // Validate session context fields
  TestValidator.predicate(
    "session ip is not empty",
    firstSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session href is not empty",
    firstSession.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer is not empty",
    firstSession.referrer.length > 0,
  );
  // Validate timestamps
  TestValidator.predicate(
    "session created_at is valid datetime",
    new Date(firstSession.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "session expired_at is valid datetime",
    new Date(firstSession.expired_at) instanceof Date,
  );
  TestValidator.predicate(
    "session expired_at is after created_at",
    new Date(firstSession.expired_at) > new Date(firstSession.created_at),
  );
}