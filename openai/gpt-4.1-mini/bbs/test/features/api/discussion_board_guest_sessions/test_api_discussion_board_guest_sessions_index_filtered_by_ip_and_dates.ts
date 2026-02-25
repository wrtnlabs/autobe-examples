import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_sessions_index_filtered_by_ip_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login setup
  const adminConnection: api.IConnection = { host: connection.host };
  async function authorize_admin_login(
    connection: api.IConnection,
    input: {
      body: {
        email: string;
        password: string;
      };
    },
  ): Promise<IAuthorizationToken> {
    // Mock admin login returns proper IAuthorizationToken
    return {
      access: "admin-token",
      refresh: "admin-refresh-token",
      expired_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      refreshable_until: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    } satisfies IAuthorizationToken;
  }
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@discussionboard.test",
      password: "testadmin1234",
    },
  });
  // 2. Create some guest sessions by guest join with known IP
  const guestConnection: api.IConnection = { host: connection.host };
  const testIp = "192.168.0.42";
  const guestJoinResult = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(12),
      userAgent: "Mozilla/5.0 (compatible; AutoBE Test)",
      ipAddress: testIp,
      anonymousId: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestJoinResult);
  // 3. Define date filters around now
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const createdAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString(); // 1 day ahead
  const expiredAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 3,
  ).toISOString(); // 3 days ago
  const expiredAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 3,
  ).toISOString(); // 3 days ahead
  // 4. Compose request body with IP and date filters
  const body: IDiscussionBoardRegisteredUserSession.IRequest = {
    ip: testIp,
    createdAtFrom,
    createdAtTo,
    expiredAtFrom,
    expiredAtTo,
    page: 1,
    limit: 10,
  };
  // 5. Call session index using admin connection
  const page = await api.functional.discussionBoard.guest.sessions.index(
    adminConnection,
    { body },
  );
  typia.assert(page);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    page.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    page.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    page.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages >= 0", page.pagination.pages >= 0);
  TestValidator.predicate(
    "pagination pages matches calculated pages",
    page.pagination.pages === 0 ||
      page.pagination.pages ===
        Math.ceil(page.pagination.records / page.pagination.limit),
  );
  // 7. Validate session entries
  for (const session of page.data) {
    typia.assert(session); // Assert session type
    // IP filter is exact match
    TestValidator.equals("session ip matches filter", session.ip, testIp);
    // created_at must be within createdAtFrom and createdAtTo
    TestValidator.predicate(
      "session created_at >= createdAtFrom",
      session.created_at >= createdAtFrom,
    );
    TestValidator.predicate(
      "session created_at <= createdAtTo",
      session.created_at <= createdAtTo,
    );
    // expired_at is either null or within expiredAtFrom and expiredAtTo
    if (session.expired_at !== null) {
      TestValidator.predicate(
        "session expired_at >= expiredAtFrom",
        session.expired_at >= expiredAtFrom,
      );
      TestValidator.predicate(
        "session expired_at <= expiredAtTo",
        session.expired_at <= expiredAtTo,
      );
    }
  }
}
