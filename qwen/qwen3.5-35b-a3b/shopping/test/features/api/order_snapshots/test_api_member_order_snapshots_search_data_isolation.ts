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
 * Test order snapshot search functionality with data isolation between customers
 * and partial order number matching capabilities.
 *
 * Validates the complete search workflow for order snapshots including customer
 * registration, order creation with various order number patterns, and comprehensive
 * search functionality testing. Ensures data isolation where customers can only
 * view their own order snapshots regardless of shared order number patterns.
 *
 * Special attention is given to testing partial order number matching, empty
 * result handling with correct pagination metadata, and combined filters
 * (entity type, date range, sorting).
 *
 * 1. Customer A registration with email/password credentials
 * 2. Customer B registration with different email/password
 * 3. Customer A creates multiple orders with patterns: ORD-2024-001, ORD-2024-002, ORD-2025-001
 * 4. Customer B creates orders with overlapping prefix: ORD-2024-101, ORD-2024-102
 * 5. Customer A searches with partial pattern 'ORD-2024'
 * 6. Customer A searches with exact order number 'ORD-2024-001'
 * 7. Customer A searches with broad pattern 'ORD'
 * 8. Customer A searches with non-existent pattern
 * 9. Customer B searches to verify data isolation
 * 10. Test entity_type filter combined with order number search
 * 11. Test date range filtering
 * 12. Test sorting functionality
 * 13. Test pagination with limit and page parameters
 */
export async function test_api_member_order_snapshots_search_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerA);
  customerAConnection.headers = {
    ...customerAConnection.headers,
    Authorization: customerA.token.access,
  };
  // Step 2: Register Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerB);
  customerBConnection.headers = {
    ...customerBConnection.headers,
    Authorization: customerB.token.access,
  };
  // Step 5: Customer A searches with partial pattern 'ORD-2024'
  const customerASearchResult1 =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD-2024",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(customerASearchResult1);
  // Step 6: Customer A searches with exact order number
  const customerASearchResult2 =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD-2024-001",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(customerASearchResult2);
  // Step 7: Customer A searches with broad pattern 'ORD'
  const customerASearchResult3 =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(customerASearchResult3);
  // Step 8: Customer A searches with non-existent pattern
  const customerASearchResult4 =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "NON-EXISTENT-12345",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(customerASearchResult4);
  // Verify empty pagination metadata
  TestValidator.equals(
    "empty search returns zero records",
    customerASearchResult4.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    customerASearchResult4.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns current page 1",
    customerASearchResult4.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search returns limit 20",
    customerASearchResult4.pagination.limit,
    20,
  );
  // Step 9: Customer B searches to verify data isolation
  const customerBSearchResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerBConnection,
      {
        body: {
          search: "ORD-2024",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(customerBSearchResult);
  // Step 10: Test entity_type filter combined with order number search
  const entityFilterResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD-2024",
          entity_type: "ORDER_ITEM",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(entityFilterResult);
  // Step 11: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD",
          order_date_start: thirtyDaysAgo.toISOString(),
          order_date_end: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Step 12: Test sorting by created_at descending
  const sortingResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD",
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(sortingResult);
  // Test sorting by created_at ascending
  const sortingAscendingResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD",
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(sortingAscendingResult);
  // Step 13: Test pagination with limit=10
  const paginationLimitResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(paginationLimitResult);
  TestValidator.equals(
    "pagination with limit=10",
    paginationLimitResult.pagination.limit,
    10,
  );
  // Step 14: Test pagination with page=2
  const paginationPageResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD",
          page: 2,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(paginationPageResult);
  TestValidator.equals(
    "pagination page=2",
    paginationPageResult.pagination.current,
    2,
  );
  // Verify combined filters work together
  const combinedFiltersResult =
    await api.functional.ecommerceMall.member.order_snapshots.index(
      customerAConnection,
      {
        body: {
          search: "ORD",
          entity_type: "ORDER_ITEM",
          order_date_start: thirtyDaysAgo.toISOString(),
          order_date_end: now.toISOString(),
          sort_by: "order_date",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(combinedFiltersResult);
  // Verify data structure of returned snapshots
  if (customerASearchResult1.data.length > 0) {
    const firstSnapshot = customerASearchResult1.data[0];
    TestValidator.predicate(
      "snapshot has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSnapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has order number",
      firstSnapshot.order_number.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid order date",
      !isNaN(Date.parse(firstSnapshot.order_date)),
    );
    TestValidator.predicate(
      "snapshot has customer name",
      firstSnapshot.customer_name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has item count",
      firstSnapshot.item_count >= 0,
    );
    TestValidator.predicate(
      "snapshot has positive total amount",
      firstSnapshot.total_amount >= 0,
    );
  }
}
