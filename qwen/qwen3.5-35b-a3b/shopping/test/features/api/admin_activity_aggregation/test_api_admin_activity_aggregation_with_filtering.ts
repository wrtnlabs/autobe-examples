import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallActivityAggregation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallActivityAggregation";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallActivityAggregation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallActivityAggregation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_activity_aggregation_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test with no filters (get all activities)
  const allAggregation =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(allAggregation);
  TestValidator.predicate(
    "all aggregation has pagination",
    allAggregation.pagination !== undefined,
  );
  // 3. Test with actor_types filter (only customer activities)
  const customerFilter =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actor_types: ["customer"] satisfies (
            | "customer"
            | "seller"
            | "admin"
            | "super_admin"
          )[],
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(customerFilter);
  TestValidator.predicate(
    "customer filter has pagination",
    customerFilter.pagination !== undefined,
  );
  // 4. Test with entity_types filter (only order activities)
  const orderFilter =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          entity_types: [
            "order",
            "product",
            "review",
            "shipment",
          ] satisfies string[],
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(orderFilter);
  TestValidator.predicate(
    "order filter has pagination",
    orderFilter.pagination !== undefined,
  );
  // 5. Test with action_types filter (only created activities)
  const createdFilter =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          action_types: [
            "created",
            "updated",
            "deleted",
            "approved",
            "rejected",
          ] satisfies string[],
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(createdFilter);
  TestValidator.predicate(
    "created filter has pagination",
    createdFilter.pagination !== undefined,
  );
  // 6. Test with date range filter
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const toDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const dateFilter =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          from: fromDate,
          to: toDate,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(dateFilter);
  TestValidator.predicate(
    "date filter has pagination",
    dateFilter.pagination !== undefined,
  );
  // 7. Test with multiple filters combined
  const combinedFilter =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actor_types: ["customer", "seller"] satisfies (
            | "customer"
            | "seller"
            | "admin"
            | "super_admin"
          )[],
          entity_types: ["order", "product"] satisfies string[],
          action_types: ["created", "updated"] satisfies string[],
          from: fromDate,
          to: toDate,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter has pagination",
    combinedFilter.pagination !== undefined,
  );
  // 8. Test with group_by dimension
  const groupedFilter =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          group_by: ["actor_type", "entity_type", "action_type"] satisfies (
            | "actor_type"
            | "entity_type"
            | "action_type"
            | "date"
          )[],
          sort_by: "count" satisfies
            | "count"
            | "actor_type"
            | "entity_type"
            | "action_type"
            | "date",
          sort_order: "desc" satisfies "asc" | "desc",
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(groupedFilter);
  TestValidator.predicate(
    "grouped filter has pagination",
    groupedFilter.pagination !== undefined,
  );
  // 9. Verify data structure in aggregation results
  for (const item of allAggregation.data) {
    typia.assert(item);
    TestValidator.predicate(
      "item actor_type is string",
      typeof item.actor_type === "string",
    );
    TestValidator.predicate(
      "item entity_type is string",
      typeof item.entity_type === "string",
    );
    TestValidator.predicate(
      "item action_type is string",
      typeof item.action_type === "string",
    );
    TestValidator.predicate("item count is at least 1", item.count >= 1);
    TestValidator.predicate(
      "item created_at is string",
      typeof item.created_at === "string",
    );
  }
  // 10. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    allAggregation.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    allAggregation.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allAggregation.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allAggregation.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation correct",
    allAggregation.pagination.pages ===
      Math.ceil(
        allAggregation.pagination.records / allAggregation.pagination.limit,
      ),
  );
  // 11. Verify filtering affects counts
  if (
    allAggregation.pagination.records > 0 &&
    customerFilter.pagination.records > 0
  ) {
    // Customer filter should return subset of all activities
    TestValidator.predicate(
      "customer count <= total count",
      customerFilter.pagination.records <= allAggregation.pagination.records,
    );
  }
}
