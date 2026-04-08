import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_filter_by_guest_and_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first guest session
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1Auth = await authorize_guest_join(guest1Connection, {});
  const guest1Id = guest1Auth.id;
  // Step 2: Create second guest session
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2Auth = await authorize_guest_join(guest2Connection, {});
  const guest2Id = guest2Auth.id;
  // Step 3: Filter by guestId1 with isExpired=false (active sessions)
  const activeSessionsForGuest1 =
    await api.functional.ecommerceMall.guest_sessions.index(connection, {
      body: {
        guestId: guest1Id,
        isExpired: false,
      } satisfies IEcommerceMallGuestSession.IRequest,
    });
  typia.assert(activeSessionsForGuest1);
  // Verify all returned sessions belong to guest1
  TestValidator.equals(
    "has records for guest1",
    activeSessionsForGuest1.data.length > 0,
    true,
  );
  for (const session of activeSessionsForGuest1.data) {
    TestValidator.equals(
      "session belongs to guest1",
      session.guest.id,
      guest1Id,
    );
  }
  // Step 4: Verify guest2's sessions are NOT in the results
  for (const session of activeSessionsForGuest1.data) {
    TestValidator.notEquals(
      "guest2 session not in guest1 results",
      session.guest.id,
      guest2Id,
    );
  }
  // Step 5: Filter by guestId1 with isExpired=true (expired sessions)
  const expiredSessionsForGuest1 =
    await api.functional.ecommerceMall.guest_sessions.index(connection, {
      body: {
        guestId: guest1Id,
        isExpired: true,
      } satisfies IEcommerceMallGuestSession.IRequest,
    });
  typia.assert(expiredSessionsForGuest1);
  // Step 6: Filter by non-existent guestId
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.ecommerceMall.guest_sessions.index(
    connection,
    {
      body: {
        guestId: nonExistentGuestId,
      } satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty data array for non-existent guest
  TestValidator.equals(
    "empty data for non-existent guest",
    emptyResult.data.length,
    0,
  );
}
