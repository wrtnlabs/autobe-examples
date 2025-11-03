import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderStatusHistory";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";

/**
 * Validates that an admin can access the paginated, filterable status history
 * of an order, filtering by status, actor, and date.
 *
 * Flow:
 *
 * 1. Register and authenticate an admin
 * 2. Use a (random) order code to query the endpoint for paginated status history
 * 3. Validate that standard paged results work
 * 4. Query with filter options (by from_status, to_status, actor, start_date,
 *    end_date)
 * 5. Validate empty result for orders with no transitions
 * 6. Validate error for non-existent orderCode
 */
export async function test_api_order_status_history_paginated_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a hypothetical (random) order code for positive test
  const orderCode: string = RandomGenerator.alphaNumeric(14);

  // 3. Search with no filters (all history, default)
  const allHistory =
    await api.functional.shopping.admin.orders.status_history.index(
      connection,
      {
        orderCode,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(allHistory);
  TestValidator.equals(
    "paginated data returned",
    Array.isArray(allHistory.data),
    true,
  );
  TestValidator.equals(
    "pagination structure valid",
    typeof allHistory.pagination === "object",
    true,
  );

  // 4. Try filtered search by from_status
  const filterStatus = "pending";
  const statusFiltered =
    await api.functional.shopping.admin.orders.status_history.index(
      connection,
      {
        orderCode,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 5 as number & tags.Type<"int32">,
          from_status: filterStatus,
        },
      },
    );
  typia.assert(statusFiltered);
  if (statusFiltered.data.length > 0) {
    for (const hist of statusFiltered.data) {
      TestValidator.equals(
        "status filtered correctly",
        hist.from_status,
        filterStatus,
      );
    }
  }

  // 5. Try filtered by actor and date range
  const filterActor = "admin";
  const nowISO = new Date().toISOString();
  const actorDateFiltered =
    await api.functional.shopping.admin.orders.status_history.index(
      connection,
      {
        orderCode,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 2 as number & tags.Type<"int32">,
          actor: filterActor,
          start_date: nowISO,
          end_date: nowISO,
        },
      },
    );
  typia.assert(actorDateFiltered);
  if (actorDateFiltered.data.length > 0) {
    for (const item of actorDateFiltered.data) {
      TestValidator.equals("filtered by actor", item.triggered_by, filterActor);
      TestValidator.predicate(
        "date filter applies",
        item.occurred_at >= nowISO && item.occurred_at <= nowISO,
      );
    }
  }

  // 6. Query for an orderCode that has no transitions
  const emptyOrderCode = RandomGenerator.alphaNumeric(16);
  const emptyHistory =
    await api.functional.shopping.admin.orders.status_history.index(
      connection,
      {
        orderCode: emptyOrderCode,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 3 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(emptyHistory);
  TestValidator.equals(
    "no transitions yields empty array",
    emptyHistory.data.length,
    0,
  );

  // 7. Error case: non-existent orderCode
  await TestValidator.error("non-existent orderCode should error", async () => {
    await api.functional.shopping.admin.orders.status_history.index(
      connection,
      {
        orderCode: "__NO_SUCH_ORDER_CODE__",
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 1 as number & tags.Type<"int32">,
        },
      },
    );
  });
}
