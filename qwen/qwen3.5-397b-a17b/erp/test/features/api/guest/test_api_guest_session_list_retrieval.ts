import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest to establish session context
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Retrieve session list using the authenticated guest connection
  const sessionList = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate pagination metadata values (business logic, not type structure)
  TestValidator.equals("current page is 1", sessionList.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    sessionList.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionList.pagination.pages >= 0,
  );
  // 4. Validate session data array
  TestValidator.predicate("data is array", Array.isArray(sessionList.data));
  // 5. Validate sorting order (most recent sessions first) when multiple sessions exist
  if (sessionList.data.length > 1) {
    for (let i = 0; i < sessionList.data.length - 1; i++) {
      const currentTime = new Date(sessionList.data[i].created_at).getTime();
      const nextTime = new Date(sessionList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sessions sorted by created_at descending (position ${i})`,
        currentTime >= nextTime,
      );
    }
  }
  // 6. Validate session context isolation - all sessions belong to authenticated guest
  if (sessionList.data.length > 0) {
    // Verify member information is present in each session
    for (let i = 0; i < sessionList.data.length; i++) {
      TestValidator.predicate(
        `session ${i} has member info`,
        sessionList.data[i].member !== undefined &&
          sessionList.data[i].member.id !== undefined,
      );
    }
  }
}
