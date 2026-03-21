import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_guest_session_ip_security_investigation(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering guest sessions by IP address for security investigation purposes.
  // Validates IP filtering with partial match, cross-field search functionality,
  // and pagination support for security monitoring and fraud detection.
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve all guest sessions to analyze available data
  const allSessions = await api.functional.erpHrm.member.guest_sessions.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IErpHrmGuestSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // 3. Test IP filtering with partial match
  if (allSessions.data.length > 0) {
    // Use partial IP from first session for testing
    const sampleSession = allSessions.data[0];
    const ipParts = sampleSession.ip.split(".");
    const ipPattern = ipParts.slice(0, 3).join(".");
    // Test IP filter returns matching sessions
    const ipFiltered = await api.functional.erpHrm.member.guest_sessions.index(
      memberConnection,
      {
        body: {
          ip: ipPattern,
          limit: 100,
        } satisfies IErpHrmGuestSession.IRequest,
      },
    );
    typia.assert(ipFiltered);
    // Verify all returned sessions have IPs matching the pattern
    TestValidator.predicate(
      "all sessions match IP pattern",
      ipFiltered.data.every((session) => session.ip.includes(ipPattern)),
    );
    // 4. Test pagination with IP filter
    const paginatedResult =
      await api.functional.erpHrm.member.guest_sessions.index(
        memberConnection,
        {
          body: {
            ip: ipPattern,
            page: 1,
            limit: 10,
          } satisfies IErpHrmGuestSession.IRequest,
        },
      );
    typia.assert(paginatedResult);
    // Verify pagination structure
    TestValidator.equals(
      "pagination current page",
      paginatedResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit",
      paginatedResult.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "all paginated sessions match IP pattern",
      paginatedResult.data.every((session) => session.ip.includes(ipPattern)),
    );
    // 5. Test cross-field search functionality
    const searchPattern = sampleSession.ip.substring(0, 8);
    const searchResult =
      await api.functional.erpHrm.member.guest_sessions.index(
        memberConnection,
        {
          body: {
            search: searchPattern,
            limit: 100,
          } satisfies IErpHrmGuestSession.IRequest,
        },
      );
    typia.assert(searchResult);
    // Verify search matches across IP, href, or referrer
    TestValidator.predicate(
      "cross-field search matches IP, href, or referrer",
      searchResult.data.every((session) => {
        const ipMatch = session.ip.includes(searchPattern);
        const hrefMatch = session.href.includes(searchPattern);
        const referrerMatch =
          session.referrer !== null && session.referrer.includes(searchPattern);
        return ipMatch || hrefMatch || referrerMatch;
      }),
    );
  }
}
