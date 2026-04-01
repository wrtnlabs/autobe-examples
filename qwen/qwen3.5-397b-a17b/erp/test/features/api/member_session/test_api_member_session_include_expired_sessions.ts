import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session list with expired session filtering.
 *
 * This test validates the expired session filter functionality:
 * 1. Member registers and authenticates (creating initial session)
 * 2. Fetch sessions with expired=true (should include all sessions)
 * 3. Fetch sessions with expired=false (should exclude expired sessions)
 * 4. Fetch sessions without expired parameter (default: exclude expired)
 * 5. Compare result counts and validate session data structure
 */
export async function test_api_member_session_include_expired_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member (creates initial session)
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Fetch sessions with expired=true (should return all sessions)
  const allSessionsResponse =
    await api.functional.hrmPlatform.member.sessions.index(memberConnection, {
      body: {
        expired: true,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(allSessionsResponse);
  // 3. Fetch sessions with expired=false (should return only active sessions)
  const activeSessionsResponse =
    await api.functional.hrmPlatform.member.sessions.index(memberConnection, {
      body: {
        expired: false,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(activeSessionsResponse);
  // 4. Fetch sessions without expired parameter (default behavior)
  const defaultSessionsResponse =
    await api.functional.hrmPlatform.member.sessions.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(defaultSessionsResponse);
  // 5. Validate pagination structure exists
  TestValidator.predicate(
    "all sessions has pagination",
    allSessionsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "active sessions has pagination",
    activeSessionsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default sessions has pagination",
    defaultSessionsResponse.pagination !== undefined,
  );
  // 6. Validate session counts
  const allSessionsCount = allSessionsResponse.data.length;
  const activeSessionsCount = activeSessionsResponse.data.length;
  const defaultSessionsCount = defaultSessionsResponse.data.length;
  TestValidator.predicate(
    "all sessions count is non-negative",
    allSessionsCount >= 0,
  );
  TestValidator.predicate(
    "active sessions count is non-negative",
    activeSessionsCount >= 0,
  );
  TestValidator.predicate(
    "default sessions count is non-negative",
    defaultSessionsCount >= 0,
  );
  // 7. Validate that expired=true returns >= sessions than expired=false
  TestValidator.predicate(
    "expired=true should return all sessions including expired",
    allSessionsCount >= activeSessionsCount,
  );
  // 8. Validate that default behavior matches expired=false (excludes expired sessions)
  TestValidator.equals(
    "default behavior should exclude expired sessions",
    defaultSessionsCount,
    activeSessionsCount,
  );
  // 9. Validate member info in sessions matches authenticated member
  if (activeSessionsCount > 0) {
    const activeSession = activeSessionsResponse.data[0];
    TestValidator.equals(
      "session member id matches authenticated member",
      activeSession.member.id,
      authResult.id,
    );
    TestValidator.equals(
      "session member display_name matches authenticated member",
      activeSession.member.display_name,
      authResult.display_name,
    );
  }
  // 10. Validate all sessions belong to the authenticated member
  if (allSessionsCount > 0) {
    allSessionsResponse.data.forEach((session, index) => {
      TestValidator.equals(
        `session[${index}] member id matches authenticated member`,
        session.member.id,
        authResult.id,
      );
    });
  }
}
