import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeGuestSession";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session IP filtering for security monitoring.
 *
 * Validates that an authenticated member can filter their session list by a specific IP address to identify all sessions originating from a particular IP. This security auditing capability helps members detect suspicious login activity from unusual locations.
 *
 * The test verifies that the IP filter parameter performs exact equality matching and returns only sessions that match the specified IP address. Pagination metadata is also validated to ensure proper response structure.
 *
 * 1. Register a new member account with unique credentials.
 * 2. Retrieve member's session list without filters to get baseline sessions.
 * 3. Extract IP address from the first session in the list.
 * 4. Query sessions again with IP filter parameter set to the extracted IP.
 * 5. Validate all returned sessions match the filtered IP address exactly.
 * 6. Validate pagination metadata is correct and consistent.
 */
export async function test_api_member_sessions_ip_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.name(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve member's session list without filters
  const allSessions: IPageIRedditLikeGuestSession.ISummary =
    await api.functional.redditLike.member.sessions.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditLikeGuestSession.IRequest,
    });
  typia.assert(allSessions);
  // Validate we have at least one session to filter
  TestValidator.predicate("has sessions", allSessions.data.length > 0);
  // 3. Extract IP address from the first session
  const targetIp: string = allSessions.data[0].ip;
  // 4. Query sessions with IP filter
  const filteredSessions: IPageIRedditLikeGuestSession.ISummary =
    await api.functional.redditLike.member.sessions.index(memberConnection, {
      body: {
        ip: targetIp,
        page: 1,
        limit: 100,
      } satisfies IRedditLikeGuestSession.IRequest,
    });
  typia.assert(filteredSessions);
  // 5. Validate all returned sessions match the filtered IP
  TestValidator.predicate(
    "all sessions match filtered IP",
    filteredSessions.data.every((session) => session.ip === targetIp),
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    filteredSessions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    filteredSessions.pagination.records === filteredSessions.data.length,
  );
}
