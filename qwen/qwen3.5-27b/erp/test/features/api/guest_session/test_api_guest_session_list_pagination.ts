import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuestSession";
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
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  // 2. Create 50 guest sessions for pagination testing
  // Each join creates a new session, so we call it 50 times with unique fingerprints
  for (let i = 0; i < 50; i++) {
    const tempConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(tempConnection, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformGuest.IJoin,
    });
  }
  // 3. Test default pagination (no page/limit specified)
  const defaultResult = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default returns up to 20 items",
    () => defaultResult.data.length <= 20,
  );
  // 4. Test with page=1, limit=10
  const page1Limit10 = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: { page: 1, limit: 10 } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 limit 10 - current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 - limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 limit 10 - data count",
    page1Limit10.data.length,
    10,
  );
  // 5. Test with page=2, limit=10
  const page2Limit10 = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: { page: 2, limit: 10 } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(page2Limit10);
  TestValidator.equals(
    "page 2 limit 10 - current page",
    page2Limit10.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 10 - limit",
    page2Limit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 limit 10 - data count",
    page2Limit10.data.length,
    10,
  );
  // 6. Verify no duplicate session IDs between page 1 and page 2
  const page1Ids = new Set(page1Limit10.data.map((s) => s.id));
  const page2Ids = new Set(page2Limit10.data.map((s) => s.id));
  let hasDuplicate = false;
  for (const id of page1Ids) {
    if (page2Ids.has(id)) {
      hasDuplicate = true;
      break;
    }
  }
  TestValidator.predicate(
    "no duplicate IDs between page 1 and 2",
    () => !hasDuplicate,
  );
  // 7. Test with page=5, limit=10
  const page5Limit10 = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: { page: 5, limit: 10 } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(page5Limit10);
  TestValidator.equals(
    "page 5 limit 10 - current page",
    page5Limit10.pagination.current,
    5,
  );
  TestValidator.equals(
    "page 5 limit 10 - limit",
    page5Limit10.pagination.limit,
    10,
  );
  // 8. Test with page=1, limit=100 (max limit)
  const page1Limit100 = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: { page: 1, limit: 100 } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(page1Limit100);
  TestValidator.equals(
    "page 1 limit 100 - current page",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 100 - limit",
    page1Limit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 returns all sessions",
    () => page1Limit100.data.length === page1Limit100.pagination.records,
  );
  // 9. Test with page=1, limit=1
  const page1Limit1 = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: { page: 1, limit: 1 } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(page1Limit1);
  TestValidator.equals(
    "page 1 limit 1 - current page",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 - limit",
    page1Limit1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 - data count",
    page1Limit1.data.length,
    1,
  );
  // 10. Verify pagination metadata consistency
  TestValidator.equals(
    "total records consistent",
    page1Limit100.pagination.records,
    page1Limit10.pagination.records,
  );
  TestValidator.equals(
    "pages calculation correct for limit 10",
    page1Limit10.pagination.pages,
    Math.ceil(page1Limit10.pagination.records / 10),
  );
  TestValidator.equals(
    "pages calculation correct for limit 100",
    page1Limit100.pagination.pages,
    Math.ceil(page1Limit100.pagination.records / 100),
  );
  // 11. Verify sessions are sorted by created_at descending
  TestValidator.predicate("sessions sorted by created_at descending", () => {
    for (let i = 1; i < page1Limit100.data.length; i++) {
      const prev = new Date(page1Limit100.data[i - 1].created_at).getTime();
      const curr = new Date(page1Limit100.data[i].created_at).getTime();
      if (curr > prev) {
        return false;
      }
    }
    return true;
  });
}
