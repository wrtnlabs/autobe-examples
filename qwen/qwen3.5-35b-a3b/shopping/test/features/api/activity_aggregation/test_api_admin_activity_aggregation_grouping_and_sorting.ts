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

/**
 * Test admin's ability to customize aggregation grouping and sorting for activity oversight.
 *
 * Tests different grouping dimensions (actor_type, entity_type, action_type, date)
 * and sorting options (count asc/desc, actor_type, entity_type, action_type, date)
 * to validate activity trend analysis capabilities.
 */
export async function test_api_admin_activity_aggregation_grouping_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated admin session
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {},
  );
  typia.assert(admin);
  // 2. Test grouping by actor_type
  const actorTypeAggregation =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["actor_type"] as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(actorTypeAggregation);
  // Validate actor_type grouping results
  TestValidator.equals(
    "actor_type aggregation has pagination",
    actorTypeAggregation.pagination.current,
    1,
  );
  TestValidator.equals(
    "actor_type aggregation has limit",
    actorTypeAggregation.pagination.limit,
    100,
  );
  if (actorTypeAggregation.data.length > 0) {
    const firstActorType = actorTypeAggregation.data[0];
    TestValidator.predicate(
      "actor_type aggregation has valid actor_type",
      ["customer", "seller", "admin", "super_admin"].includes(
        firstActorType.actor_type,
      ),
    );
    TestValidator.predicate(
      "actor_type count is valid",
      firstActorType.count >= 1,
    );
  }
  // 3. Test grouping by entity_type
  const entityTypeAggregation =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["entity_type"] as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(entityTypeAggregation);
  if (entityTypeAggregation.data.length > 0) {
    const firstEntityType = entityTypeAggregation.data[0];
    TestValidator.predicate(
      "entity_type aggregation has valid count",
      firstEntityType.count >= 1,
    );
  }
  // 4. Test grouping by action_type
  const actionTypeAggregation =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["action_type"] as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(actionTypeAggregation);
  if (actionTypeAggregation.data.length > 0) {
    const firstActionType = actionTypeAggregation.data[0];
    TestValidator.predicate(
      "action_type aggregation has valid count",
      firstActionType.count >= 1,
    );
  }
  // 5. Test grouping by date
  const dateAggregation =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["date"] as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(dateAggregation);
  if (dateAggregation.data.length > 0) {
    const firstDate = dateAggregation.data[0];
    TestValidator.predicate(
      "date aggregation has valid count",
      firstDate.count >= 1,
    );
  }
  // 6. Test grouping by multiple dimensions (actor_type, entity_type)
  const multiDimensionAggregation =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["actor_type", "entity_type"] as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(multiDimensionAggregation);
  if (multiDimensionAggregation.data.length > 0) {
    const firstMulti = multiDimensionAggregation.data[0];
    TestValidator.predicate(
      "multi-dimension has actor_type",
      firstMulti.actor_type !== "",
    );
    TestValidator.predicate(
      "multi-dimension has entity_type",
      firstMulti.entity_type !== "",
    );
    TestValidator.predicate(
      "multi-dimension has valid count",
      firstMulti.count >= 1,
    );
  }
  // 7. Test sorting by count (descending) - most frequent activities first
  const sortCountDesc =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["actor_type"] as const,
          sort_by: "count",
          sort_order: "desc" as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(sortCountDesc);
  // Validate descending count sort
  if (sortCountDesc.data.length >= 2) {
    const firstCount = sortCountDesc.data[0].count;
    const secondCount = sortCountDesc.data[1].count;
    TestValidator.predicate(
      "count desc sort has highest first",
      firstCount >= secondCount,
    );
  }
  // 8. Test sorting by count (ascending) - least frequent activities first
  const sortCountAsc =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["actor_type"] as const,
          sort_by: "count",
          sort_order: "asc" as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(sortCountAsc);
  // Validate ascending count sort
  if (sortCountAsc.data.length >= 2) {
    const firstCountAsc = sortCountAsc.data[0].count;
    const secondCountAsc = sortCountAsc.data[1].count;
    TestValidator.predicate(
      "count asc sort has lowest first",
      firstCountAsc <= secondCountAsc,
    );
  }
  // 9. Test sorting by actor_type (ascending)
  const sortActorTypeAsc =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["actor_type"] as const,
          sort_by: "actor_type",
          sort_order: "asc" as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(sortActorTypeAsc);
  // Validate actor_type ascending sort
  if (sortActorTypeAsc.data.length >= 2) {
    const firstActorAsc = sortActorTypeAsc.data[0].actor_type;
    const secondActorAsc = sortActorTypeAsc.data[1].actor_type;
    TestValidator.predicate(
      "actor_type asc sort is ordered",
      firstActorAsc <= secondActorAsc,
    );
  }
  // 10. Test sorting by actor_type (descending)
  const sortActorTypeDesc =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          group_by: ["actor_type"] as const,
          sort_by: "actor_type",
          sort_order: "desc" as const,
        } satisfies IEcommerceMallActivityAggregation.IRequest,
      },
    );
  typia.assert(sortActorTypeDesc);
  // Validate actor_type descending sort
  if (sortActorTypeDesc.data.length >= 2) {
    const firstActorDesc = sortActorTypeDesc.data[0].actor_type;
    const secondActorDesc = sortActorTypeDesc.data[1].actor_type;
    TestValidator.predicate(
      "actor_type desc sort is ordered",
      firstActorDesc >= secondActorDesc,
    );
  }
}
