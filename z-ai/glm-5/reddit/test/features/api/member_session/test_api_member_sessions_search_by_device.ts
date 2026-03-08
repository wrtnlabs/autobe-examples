import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_search_by_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      ip: "192.168.1.100",
    },
  });
  typia.assert(authResult);
  // 2. Get all sessions for the member
  const allSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(allSessions);
  // Verify we have at least one session (the one created during join)
  TestValidator.predicate("member has sessions", allSessions.data.length > 0);
  // Note the userAgent and IP values from sessions
  const session = allSessions.data[0];
  const userAgent = session.userAgent;
  const ip = session.ip;
  // 3. Search by partial browser/device name in userAgent (case-insensitive test)
  // Extract a partial string from userAgent for testing
  if (userAgent !== null && userAgent.length > 0) {
    const searchTerm = userAgent.substring(0, Math.min(5, userAgent.length));
    const userAgentResults =
      await api.functional.communityPlatform.member.sessions.index(
        memberConnection,
        {
          body: {
            search: searchTerm,
          },
        },
      );
    typia.assert(userAgentResults);
    // 4. Verify results contain sessions matching the search term
    TestValidator.predicate(
      "search by userAgent returns results",
      userAgentResults.data.length > 0,
    );
    TestValidator.predicate(
      "all results contain search term in userAgent or ip",
      userAgentResults.data.every(
        (s) =>
          (s.userAgent !== null && s.userAgent.includes(searchTerm)) ||
          s.ip.includes(searchTerm),
      ),
    );
    // Test case-insensitivity with uppercase
    const upperSearchTerm = searchTerm.toUpperCase();
    const caseInsensitiveResults =
      await api.functional.communityPlatform.member.sessions.index(
        memberConnection,
        {
          body: {
            search: upperSearchTerm,
          },
        },
      );
    typia.assert(caseInsensitiveResults);
    TestValidator.predicate(
      "case-insensitive search works",
      caseInsensitiveResults.data.length > 0,
    );
  }
  // 5. Search by IP address or partial IP
  const ipSearchTerm = ip.substring(0, Math.min(7, ip.length));
  const ipResults =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          search: ipSearchTerm,
        },
      },
    );
  typia.assert(ipResults);
  // 6. Verify results contain sessions matching the IP address
  TestValidator.predicate(
    "search by IP returns results",
    ipResults.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain search term in userAgent or ip",
    ipResults.data.every(
      (s) =>
        (s.userAgent !== null && s.userAgent.includes(ipSearchTerm)) ||
        s.ip.includes(ipSearchTerm),
    ),
  );
  // 7. Search with term not matching any device info
  const nonMatchingSearch = "zzzzzzzzznonexistent12345";
  const emptyResults =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          search: nonMatchingSearch,
        },
      },
    );
  typia.assert(emptyResults);
  // 8. Verify empty results return valid pagination structure
  TestValidator.equals(
    "empty results has empty data array",
    emptyResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty results has records=0",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results has pages=0",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results has current=1",
    emptyResults.pagination.current,
    1,
  );
}
