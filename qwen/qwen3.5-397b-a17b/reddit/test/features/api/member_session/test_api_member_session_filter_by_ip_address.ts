import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session filtering by IP address.
 *
 * This test validates that authenticated members can filter their sessions
 * by IP address or IP prefix to identify login locations. Tests include:
 * 1. Creating a member account and establishing sessions
 * 2. Filtering sessions by exact IP match
 * 3. Filtering sessions by IP prefix (subnet matching)
 * 4. Testing pagination with IP-filtered results
 * 5. Testing edge case where no sessions match the IP filter
 * 6. Verifying isolation between different members' sessions
 */
export async function test_api_member_session_filter_by_ip_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account with specific IP
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Ip = "192.168.1.100";
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: member1Ip,
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create second member account with different IP for isolation test
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Ip = "10.0.0.50";
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: member2Ip,
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Test exact IP match filter for member1
  const exactMatchResult =
    await api.functional.redditClone.member.sessions.index(member1Connection, {
      body: {
        ip: member1Ip,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(exactMatchResult);
  // Verify all returned sessions match the exact IP
  TestValidator.predicate(
    "all sessions match exact IP",
    exactMatchResult.data.every((session) => session.ip === member1Ip),
  );
  // Verify member1's sessions don't contain member2's IP
  TestValidator.predicate(
    "no sessions from other member's IP",
    exactMatchResult.data.every((session) => session.ip !== member2Ip),
  );
  // 4. Test IP prefix filter (subnet matching)
  const prefixFilterResult =
    await api.functional.redditClone.member.sessions.index(member1Connection, {
      body: {
        ip: "192.168.",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(prefixFilterResult);
  // Verify all returned sessions match the IP prefix
  TestValidator.predicate(
    "all sessions match IP prefix",
    prefixFilterResult.data.every((session) =>
      session.ip.startsWith("192.168."),
    ),
  );
  // 5. Test pagination with IP filter
  const paginatedResult =
    await api.functional.redditClone.member.sessions.index(member1Connection, {
      body: {
        ip: "192.168.",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(paginatedResult);
  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current page is valid",
    paginatedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    paginatedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginatedResult.pagination.pages >= 0,
  );
  // 6. Test edge case: no sessions match the IP filter
  const noMatchResult = await api.functional.redditClone.member.sessions.index(
    member1Connection,
    {
      body: {
        ip: "999.999.999.999",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(noMatchResult);
  // Verify empty data array when no sessions match
  TestValidator.equals(
    "no matching sessions returns empty array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for no matches",
    noMatchResult.pagination.records,
    0,
  );
  // 7. Test member isolation: member2 cannot see member1's sessions
  const member2ViewingOwnSessions =
    await api.functional.redditClone.member.sessions.index(member2Connection, {
      body: {
        ip: member2Ip,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(member2ViewingOwnSessions);
  // Verify member2 only sees their own sessions
  TestValidator.predicate(
    "member2 only sees own sessions",
    member2ViewingOwnSessions.data.every(
      (session) => session.member.id === member2Auth.id,
    ),
  );
  // Verify member2 doesn't see member1's sessions
  TestValidator.predicate(
    "member2 cannot see member1's sessions",
    member2ViewingOwnSessions.data.every(
      (session) => session.member.id !== member1Auth.id,
    ),
  );
  // 8. Test with different IP prefix for member2
  const member2PrefixResult =
    await api.functional.redditClone.member.sessions.index(member2Connection, {
      body: {
        ip: "10.0.",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(member2PrefixResult);
  // Verify member2's sessions match their IP prefix
  TestValidator.predicate(
    "member2 sessions match their IP prefix",
    member2PrefixResult.data.every((session) => session.ip.startsWith("10.0.")),
  );
}
