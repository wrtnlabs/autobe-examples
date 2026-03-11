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

/**
 * Test security isolation between member session records.
 *
 * Create two separate member accounts and verify that each member can only
 * access their own session records. Validate that session summaries exclude
 * sensitive authentication tokens and only contain appropriate metadata.
 * Test filtering parameters for security and verify proper ownership validation.
 */
export async function test_api_member_session_security_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member1);
  // Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member2);
  // Test member1 can access their own sessions
  const member1Sessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      member1Connection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(member1Sessions);
  // Validate session summary structure (no sensitive tokens)
  TestValidator.equals(
    "member1 sessions array type",
    Array.isArray(member1Sessions.data),
    true,
  );
  if (member1Sessions.data.length > 0) {
    const session = member1Sessions.data[0];
    // Verify only allowed properties exist
    const allowedKeys = [
      "id",
      "created_at",
      "expired_at",
      "ip",
      "href",
      "referrer",
    ] as const;
    const actualKeys = Object.keys(session).sort();
    TestValidator.equals(
      "session summary only contains metadata",
      actualKeys,
      (allowedKeys as unknown as string[]).sort(),
    );
    // Verify property types
    TestValidator.predicate(
      "session id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "created_at is ISO datetime",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
    );
    TestValidator.predicate(
      "expired_at is ISO datetime",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
    );
    TestValidator.predicate(
      "ip is IPv4",
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
    );
  }
  // Test member2 can access their own sessions
  const member2Sessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      member2Connection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(member2Sessions);
  // Verify session IDs are different (isolation)
  if (member1Sessions.data.length > 0 && member2Sessions.data.length > 0) {
    const member1SessionIds = member1Sessions.data.map((s) => s.id);
    const member2SessionIds = member2Sessions.data.map((s) => s.id);
    // No overlap between session IDs
    const intersection = member1SessionIds.filter((id) =>
      member2SessionIds.includes(id),
    );
    TestValidator.equals(
      "session IDs should not overlap between members",
      intersection.length,
      0,
    );
  }
  // Test filtering with date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const filteredSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      member1Connection,
      {
        body: {
          created_after: yesterday.toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(filteredSessions);
  // Test IP filtering
  const ipFilteredSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      member1Connection,
      {
        body: {
          ip: "192.168.1.0/24" satisfies string &
            tags.Pattern<"^([0-9]{1,3}\\.){3}[0-9]{1,3}(\\/([0-9]|[1-2][0-9]|3[0-2]))?$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\\/([0-9]|[1-9][0-9]|1[0-2][0-8]))?$">,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(ipFilteredSessions);
  // Test pagination structure
  TestValidator.predicate(
    "pagination has required fields",
    member1Sessions.pagination.current >= 0 &&
      member1Sessions.pagination.limit >= 0 &&
      member1Sessions.pagination.records >= 0 &&
      member1Sessions.pagination.pages >= 0,
  );
}
