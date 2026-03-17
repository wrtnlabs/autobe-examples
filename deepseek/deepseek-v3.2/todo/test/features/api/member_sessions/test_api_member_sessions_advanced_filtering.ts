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

export async function test_api_member_sessions_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member with connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Create sessions with varied IP addresses and creation times
  const ipPatterns = [
    "192.168.1.10",
    "192.168.1.20",
    "192.168.2.30",
    "10.0.0.40",
    "172.16.0.50",
    "192.168.1.60",
  ] as const;
  // Create 6 sessions with different IPs and expiration times
  for (let i = 0; i < 6; i++) {
    // Each session uses different IP pattern
    const ip = typia.random<string & tags.Format<"ipv4">>();
    // Create session by using member join with different IP each time
    await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          href: `https://example.com/session/${i}` satisfies string &
            tags.Format<"uri">,
          referrer: `https://example.com/referrer/${i}` satisfies string &
            tags.Format<"uri">,
          ip: ipPatterns[i] satisfies string & tags.Format<"ipv4">,
        } satisfies ITodoAppMember.IJoin,
      },
    );
  }
  // Test 1: Combined IP and date range filtering
  const dateRangeStart = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeEnd = new Date().toISOString();
  const combinedFilterResult =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        ip: "192.168.1" satisfies string & tags.Format<"ipv4">,
        created_at_from: dateRangeStart satisfies string &
          tags.Format<"date-time">,
        created_at_to: dateRangeEnd satisfies string & tags.Format<"date-time">,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Validate IP partial match
  combinedFilterResult.data.forEach((session) => {
    TestValidator.predicate(
      "session IP should contain filter substring",
      session.ip.includes("192.168.1"),
    );
  });
  // Test 2: Filtering for expired sessions only
  const expiredFilterResult =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        is_expired: true,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(expiredFilterResult);
  // Test 3: Filtering for sessions expiring within future date range
  const futureStart = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureEnd = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureExpiryResult =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        expired_at_from: futureStart satisfies string & tags.Format<"date-time">,
        expired_at_to: futureEnd satisfies string & tags.Format<"date-time">,
      } satisfies ITodoAppMemberSession.IRequest,
    });
}