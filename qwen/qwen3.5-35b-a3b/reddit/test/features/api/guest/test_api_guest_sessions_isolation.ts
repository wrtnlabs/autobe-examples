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

export async function test_api_guest_sessions_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest A
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestA = await authorize_guest_join(guestAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "guestA123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestA);
  // 2. Create guest B
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "guestB123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestB);
  // 3. Make API calls as guest A to create sessions naturally
  const guestAListConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestAListConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "guestA123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Request sessions as guest B (using guestB's connection)
  const guestBSessionsResponse: IPageIRedditPlatformMemberSession.ISummary =
    await api.functional.redditPlatform.guest.sessions.index(guestBConnection, {
      body: {},
    });
  typia.assert(guestBSessionsResponse);
  // 5. Validate session isolation
  // Verify all sessions belong to guest B (member_id should match guestB.id)
  for (const session of guestBSessionsResponse.data) {
    TestValidator.equals(
      `session ${session.id} belongs to guest B`,
      session.member_id,
      guestB.id,
    );
  }
  // Verify no sessions from guest A appear in guest B's response
  const guestASessionIds = guestA.sessions.map((s) => s.id);
  const guestBSessionIds = guestBSessionsResponse.data.map((s) => s.id);
  for (const guestAId of guestASessionIds) {
    TestValidator.error(
      `guest B should not see guest A's session ${guestAId}`,
      () => {
        const found = guestBSessionIds.includes(guestAId);
        if (found) throw new Error(`Found guest A session in guest B's list`);
      },
    );
  }
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination records matches session count",
    guestBSessionsResponse.pagination.records,
    guestBSessionsResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages is correct",
    guestBSessionsResponse.pagination.pages,
    Math.ceil(
      guestBSessionsResponse.pagination.records /
        guestBSessionsResponse.pagination.limit,
    ),
  );
}
