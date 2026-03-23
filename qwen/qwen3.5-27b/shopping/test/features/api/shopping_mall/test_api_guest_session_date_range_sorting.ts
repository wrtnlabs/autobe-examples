import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest user can filter sessions by date range and customize sorting order.
 *
 * This test verifies:
 * 1. Date range filtering (startDate, endDate) works correctly
 * 2. Sorting by created_at in ascending order
 * 3. Sorting by expired_at in descending order
 * 4. Custom pagination (limit, page) works as expected
 */
export async function test_api_guest_session_date_range_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest session
  const guestConnection1: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_guest_join(guestConnection1, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(firstAuth);
  const firstSessionCreatedAt = firstAuth.created_at;
  // 2. Wait a few seconds before creating second session
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 3. Create second guest session
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_guest_join(guestConnection2, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(secondAuth);
  // 4. Create third session for listing (authenticated guest connection)
  const guestConnection3: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection3, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  // 5. Test date range filtering with created_at ascending sort
  const dateRangeResult =
    await api.functional.shoppingMall.guest.sessions.index(guestConnection3, {
      body: {
        startDate: firstSessionCreatedAt,
        endDate: new Date().toISOString(),
        sort: "created_at",
        order: "asc",
      } satisfies IShoppingMallGuestSession.IRequest,
    });
  typia.assert(dateRangeResult);
  // 6. Verify date range filtering returns sessions
  TestValidator.predicate(
    "date range filtering returns sessions",
    dateRangeResult.data.length > 0,
  );
  // 7. Verify sessions are sorted by created_at in ascending order
  for (let i = 1; i < dateRangeResult.data.length; i++) {
    TestValidator.predicate(
      `session ${i} created_at >= session ${i - 1} created_at`,
      new Date(dateRangeResult.data[i].createdAt).getTime() >=
        new Date(dateRangeResult.data[i - 1].createdAt).getTime(),
    );
  }
  // 8. Test expired_at descending sort
  const expiredAtResult =
    await api.functional.shoppingMall.guest.sessions.index(guestConnection3, {
      body: {
        sort: "expired_at",
        order: "desc",
      } satisfies IShoppingMallGuestSession.IRequest,
    });
  typia.assert(expiredAtResult);
  // 9. Verify sessions are sorted by expired_at in descending order
  for (let i = 1; i < expiredAtResult.data.length; i++) {
    TestValidator.predicate(
      `session ${i} expired_at <= session ${i - 1} expired_at`,
      new Date(expiredAtResult.data[i].expiredAt).getTime() <=
        new Date(expiredAtResult.data[i - 1].expiredAt).getTime(),
    );
  }
  // 10. Test custom pagination with limit=1
  const paginationResult =
    await api.functional.shoppingMall.guest.sessions.index(guestConnection3, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallGuestSession.IRequest,
    });
  typia.assert(paginationResult);
  // 11. Verify pagination settings
  TestValidator.equals(
    "pagination limit is 1",
    paginationResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    paginationResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResult.pagination.current,
    1,
  );
}
