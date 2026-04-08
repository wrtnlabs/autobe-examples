import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator product snapshots date range filtering functionality.
 *
 * Validates the date filtering capability for product snapshot audit queries. Ensures that snapshots can be retrieved within specific time windows for targeted compliance investigations and change tracking.
 *
 * This test focuses on validating the date range filtering mechanism since product creation/editing APIs are not available in the provided SDK. The test verifies proper parameter handling and response structure.
 *
 * 1. Administrator authenticates via join endpoint with random credentials
 * 2. Product snapshots are retrieved with date range filters (from/to parameters)
 * 3. Validates response structure matches IPageIEcommerceProductSnapshot.ISummary
 * 4. Tests empty date range filter (no from/to specified)
 * 5. Tests with from date only filter
 * 6. Tests with to date only filter
 * 7. Tests with both from and to date range
 * 8. Validates pagination metadata is correct
 */
export async function test_api_admin_product_snapshots_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Generate random product UUID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test with no date filters (get all snapshots)
  const allSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.admin.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Test with from date filter only
  const fromDate: string & tags.Format<"date-time"> = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const fromFilteredSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.admin.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          from: fromDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(fromFilteredSnapshots);
  // 4. Test with to date filter only
  const toDate: string & tags.Format<"date-time"> = new Date().toISOString();
  const toFilteredSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.admin.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          to: toDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(toFilteredSnapshots);
  // 5. Test with both from and to date range
  const fromRange: string & tags.Format<"date-time"> = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const toRange: string & tags.Format<"date-time"> = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const rangeFilteredSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.admin.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          from: fromRange,
          to: toRange,
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(rangeFilteredSnapshots);
  // 6. Validate pagination structure
  TestValidator.predicate(
    "pagination current >= 1",
    allSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    allSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allSnapshots.pagination.pages >= 0,
  );
  // 7. Validate snapshot data structure
  if (allSnapshots.data.length > 0) {
    const firstSnapshot = allSnapshots.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate("snapshot has id", firstSnapshot.id.length > 0);
    TestValidator.predicate("snapshot has name", firstSnapshot.name.length > 0);
    TestValidator.predicate(
      "snapshot has category_id",
      firstSnapshot.category_id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has base_price",
      typeof firstSnapshot.base_price === "number",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      firstSnapshot.created_at.length > 0,
    );
  }
  // 8. Test empty date range (future dates that should return no results)
  const futureFrom: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const futureTo: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 366,
  ).toISOString();
  const emptyRangeSnapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.admin.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          from: futureFrom,
          to: futureTo,
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyRangeSnapshots);
  TestValidator.equals(
    "empty range has no data",
    emptyRangeSnapshots.data.length,
    0,
  );
}
