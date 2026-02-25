import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string & tags.Format<"uuid">>(),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Test pagination with default parameters
  const sessions1 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sessions1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    sessions1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessions1.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    sessions1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sessions1.pagination.pages >= 0,
  );
  // Validate session data structure when sessions exist
  if (sessions1.data.length > 0) {
    const session = sessions1.data[0];
    TestValidator.equals("session has id", typeof session.id, "string");
    TestValidator.equals("session has member", session.member !== null, true);
    TestValidator.equals(
      "session has expiredAt",
      typeof session.expiredAt,
      "string",
    );
    TestValidator.equals(
      "session has createdAt",
      typeof session.createdAt,
      "string",
    );
    TestValidator.equals(
      "session has updatedAt",
      typeof session.updatedAt,
      "string",
    );
    TestValidator.equals(
      "session has lastActiveAt",
      typeof session.lastActiveAt,
      "string",
    );
    TestValidator.equals("session has ip", typeof session.ip, "string");
    TestValidator.equals(
      "session has headers",
      typeof session.headers,
      "string",
    );
  }
  // Test different pagination parameters
  const sessions2 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(sessions2);
  // Validate different pagination values
  TestValidator.equals("pagination page 2", sessions2.pagination.current, 2);
  TestValidator.equals("pagination limit 5", sessions2.pagination.limit, 5);
  // Test filtering by user type
  const sessions3 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        userType: "member",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sessions3);
  // Test filtering by session status
  const sessions4 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        sessionStatus: "active",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sessions4);
  // Test filtering by date range
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sessions5 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        startDate: yesterday,
        endDate: today,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sessions5);
  // Test empty result set
  const sessions6 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 999999,
        limit: 10,
      },
    },
  );
  typia.assert(sessions6);
  // Validate empty result structure
  TestValidator.equals(
    "empty page number",
    sessions6.pagination.current,
    999999,
  );
  TestValidator.equals("empty limit", sessions6.pagination.limit, 10);
  TestValidator.equals("empty record count", sessions6.pagination.records, 0);
  TestValidator.equals("empty data length", sessions6.data.length, 0);
}
