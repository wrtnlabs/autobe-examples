import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin filtering product snapshots by date range for auditing product changes.
 *
 * Validates the date range filtering capabilities of the admin product snapshots
 * listing endpoint. This endpoint is critical for administrators who need to audit
 * product changes within specific time periods, such as reviewing all product
 * modifications during a promotional campaign or investigating changes after a
 * policy update.
 *
 * The test verifies:
 * - Full date range filtering with both createdAfter and createdBefore parameters
 * - Partial date filtering with only createdAfter or only createdBefore
 * - Response structure with pagination metadata
 * - Date boundary handling when no snapshots exist in the specified range
 *
 * 1. Administrator authenticates using admin join endpoint to obtain authorization token.
 * 2. Admin calls product snapshots listing with various date range filter combinations.
 * 3. System returns paginated results filtered by the specified date criteria.
 * 4. All returned snapshots have createdAt within the specified range (when data exists).
 */
export async function test_api_product_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://admin.example.com/snapshots",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test full date range filtering (both createdAfter and createdBefore)
  const fullRangeResponse =
    await api.functional.ecommerceMall.admin.admin.product_snapshots.index(
      adminConnection,
      {
        body: {
          createdAfter: "2024-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          createdBefore: "2024-12-31T23:59:59.999Z" as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(fullRangeResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current",
    fullRangeResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    fullRangeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit",
    fullRangeResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    fullRangeResponse.pagination.pages >= 0,
  );
  // Validate that all returned snapshots fall within the date range
  for (const snapshot of fullRangeResponse.data) {
    const createdAt = new Date(snapshot.createdAt);
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const endDate = new Date("2024-12-31T23:59:59.999Z");
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt within range`,
      createdAt >= startDate && createdAt <= endDate,
    );
  }
  // 3. Test only createdAfter filter (snapshots from a specific date onwards)
  const afterOnlyResponse =
    await api.functional.ecommerceMall.admin.admin.product_snapshots.index(
      adminConnection,
      {
        body: {
          createdAfter: "2024-06-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(afterOnlyResponse);
  // Validate all snapshots are after the specified date
  const afterOnlyDate = new Date("2024-06-01T00:00:00.000Z");
  for (const snapshot of afterOnlyResponse.data) {
    const createdAt = new Date(snapshot.createdAt);
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt >= 2024-06-01`,
      createdAt >= afterOnlyDate,
    );
  }
  // 4. Test only createdBefore filter (snapshots up to a specific date)
  const beforeOnlyResponse =
    await api.functional.ecommerceMall.admin.admin.product_snapshots.index(
      adminConnection,
      {
        body: {
          createdBefore: "2024-06-30T23:59:59.999Z" as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(beforeOnlyResponse);
  // Validate all snapshots are before the specified date
  const beforeOnlyDate = new Date("2024-06-30T23:59:59.999Z");
  for (const snapshot of beforeOnlyResponse.data) {
    const createdAt = new Date(snapshot.createdAt);
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt <= 2024-06-30`,
      createdAt <= beforeOnlyDate,
    );
  }
  // 5. Test narrow date range (likely to return empty or minimal results)
  const narrowRangeResponse =
    await api.functional.ecommerceMall.admin.admin.product_snapshots.index(
      adminConnection,
      {
        body: {
          createdAfter: "2030-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          createdBefore: "2030-01-02T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(narrowRangeResponse);
  // Narrow range should return empty data or records should be 0
  TestValidator.predicate(
    "narrow date range returns empty or zero records",
    narrowRangeResponse.data.length === 0 ||
      narrowRangeResponse.pagination.records === 0,
  );
  // 6. Test date range with pagination
  const paginatedResponse =
    await api.functional.ecommerceMall.admin.admin.product_snapshots.index(
      adminConnection,
      {
        body: {
          createdAfter: "2024-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          createdBefore: "2024-12-31T23:59:59.999Z" as string &
            tags.Format<"date-time">,
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination page 2
  TestValidator.equals(
    "pagination page 2",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination limit 5",
    paginatedResponse.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data length <= 5",
    paginatedResponse.data.length <= 5,
  );
}
