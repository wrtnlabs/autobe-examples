import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest account to get authentication tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Create multiple sessions by making authenticated API calls
  const sessionCount = 5;
  for (let i = 0; i < sessionCount; i++) {
    // Create sessions by making authenticated calls
    const sessionConnection: api.IConnection = { host: connection.host };
    await api.functional.redditPlatform.guest.sessions.index(
      sessionConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  }
  // 3. Request the guest sessions list with default pagination
  const listConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.redditPlatform.guest.sessions.index(
    listConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(response);
  // 4. Verify the response contains all sessions belonging to the guest
  TestValidator.equals("session count", response.data.length, sessionCount);
  // 5. Verify session metadata includes correct fields
  for (const session of response.data) {
    typia.assert(session);
    TestValidator.predicate("session has id", session.id !== undefined);
    TestValidator.predicate(
      "session has member_id",
      session.member_id !== undefined,
    );
    TestValidator.predicate("session has ip", session.ip !== undefined);
    TestValidator.predicate("session has href", session.href !== undefined);
    TestValidator.predicate(
      "session has referrer",
      session.referrer !== undefined,
    );
    TestValidator.predicate(
      "session has created_at",
      session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session has expired_at",
      session.expired_at !== undefined,
    );
  }
  // 6. Verify pagination metadata is accurate
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 100);
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    sessionCount,
  );
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // 7. Verify sessions are sorted by created_at DESC
  for (let i = 1; i < response.data.length; i++) {
    const prevDate = new Date(response.data[i - 1].created_at);
    const currDate = new Date(response.data[i].created_at);
    TestValidator.predicate("sessions sorted DESC", prevDate >= currDate);
  }
  // 8. Verify member_id matches authenticated guest's ID
  for (const session of response.data) {
    TestValidator.equals("member_id matches", session.member_id, guest.id);
  }
}
