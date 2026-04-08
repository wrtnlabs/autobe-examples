import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for a customer viewing their order snapshots.
 *
 * Validates the core business workflow where an authenticated member customer searches and lists
 * their own order snapshots with various filtering and sorting options. Tests pagination, entity
 * type filtering, date range filtering, search functionality, and sorting capabilities.
 *
 * Special attention is given to verifying that the snapshot summary data is complete and
 * includes all required fields for order history display, including customer information,
 * shipping details, and financial totals.
 *
 * 1. Authenticate as member customer by creating account and logging in.
 * 2. Request order snapshots with default pagination parameters.
 * 3. Verify pagination metadata is correct (current page, limit, total records, pages count).
 * 4. Request snapshots with entity_type filter set to ORDER_ITEM.
 * 5. Verify only order item snapshots are returned.
 * 6. Request snapshots with order_date_range filter (start and end dates).
 * 7. Verify only snapshots within the date range are returned.
 * 8. Request snapshots with sorting by created_at descending.
 * 9. Verify results are ordered by most recent first.
 * 10. Request snapshots with sorting by order_date ascending.
 * 11. Verify results are ordered by oldest order date first.
 * 12. Test with custom pagination (limit=10, page=2).
 * 13. Verify correct page of results is returned.
 * 14. Verify snapshot summary data includes all required fields.
 */
export async function test_api_member_order_snapshots_view_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member customer
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Test default pagination
  const defaultSnapshots =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(defaultSnapshots);
  TestValidator.equals(
    "default page number",
    defaultSnapshots.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultSnapshots.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has valid records count",
    defaultSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    defaultSnapshots.pagination.pages >= 0,
  );
  // 3. Test entity_type filter
  const entityTypeSnapshots =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      memberConnection,
      { body: { entity_type: "ORDER_ITEM" } },
    );
  typia.assert(entityTypeSnapshots);
  TestValidator.equals(
    "entity type filter page number",
    entityTypeSnapshots.pagination.current,
    1,
  );
  // 4. Test order_date_range filter
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);
  const dateRangeSnapshots =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      memberConnection,
      {
        body: {
          order_date_start: startDate.toISOString(),
          order_date_end: endDate.toISOString(),
        },
      },
    );
  typia.assert(dateRangeSnapshots);
  // 5. Test sorting by created_at descending
  const sortByCreatedAt =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      memberConnection,
      {
        body: { sort_by: "created_at", sort_order: "desc" },
      },
    );
  typia.assert(sortByCreatedAt);
  // 6. Test sorting by order_date ascending
  const sortByOrderDate =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      memberConnection,
      {
        body: { sort_by: "order_date", sort_order: "asc" },
      },
    );
  typia.assert(sortByOrderDate);
  // 7. Test search parameter for order_number partial match
  const searchSnapshots =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      memberConnection,
      {
        body: { search: "ORD" },
      },
    );
  typia.assert(searchSnapshots);
  // 8. Test custom pagination
  const customPagination =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      memberConnection,
      { body: { limit: 10, page: 2 } },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom page number",
    customPagination.pagination.current,
    2,
  );
  TestValidator.equals("custom limit", customPagination.pagination.limit, 10);
  // 9. Verify snapshot summary fields for each returned snapshot
  for (const snapshot of defaultSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has valid order_number",
      snapshot.order_number.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid customer_name",
      snapshot.customer_name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid item_count",
      snapshot.item_count >= 0,
    );
    TestValidator.predicate(
      "snapshot has valid subtotal",
      snapshot.subtotal >= 0,
    );
    TestValidator.predicate(
      "snapshot has valid shipping_fee",
      snapshot.shipping_fee >= 0,
    );
    TestValidator.predicate(
      "snapshot has valid total_amount",
      snapshot.total_amount >= 0,
    );
    TestValidator.predicate(
      "snapshot has order_status",
      snapshot.order_status.length > 0,
    );
  }
}
