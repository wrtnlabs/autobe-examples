import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminNotification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate admin notification search with basic type, status, and priority
 * filters.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can search their own admin notifications
 *   using the PATCH /shoppingMall/admin/adminSearch/adminNotifications endpoint
 *   with basic filters (type, status, priority) and receive properly filtered
 *   results scoped to their admin id, with correct pagination metadata.
 *
 * End-to-end workflow
 *
 * 1. Create a primary admin A using POST /auth/admin/join and capture the
 *    IShoppingMallAdmin.IAuthorized response to obtain adminA.id.
 * 2. Create a secondary admin B using POST /auth/admin/join to seed notifications
 *    that must NOT be returned when filtering by adminA.
 * 3. Seed several notifications for admin A via POST
 *    /shoppingMall/admin/adminNotifications.create with varying combinations
 *    of:
 *
 *    - Type: choose fixed literal values, e.g., "risk_sla_violation" and
 *         "refund_escalation".
 *    - Status: at least "unread" and "read".
 *    - Priority: at least "high" and "normal". Ensure that at least one notification
 *         for admin A has a specific combination, for example: type =
 *         "risk_sla_violation", status = "unread", priority = "high".
 * 4. Also seed one or more notifications for admin B with the same type/status
 *    combination to validate that search is correctly scoped to
 *    shopping_mall_admin_id and does not leak other admins' notifications.
 * 5. Build an IShoppingMallAdminNotification.IRequest body with:
 *
 *    - Page = 1, limit = a small number (e.g., 20),
 *    - Shopping_mall_admin_id = adminA.id,
 *    - Types = ["risk_sla_violation"],
 *    - Statuses = ["unread"],
 *    - Priorities = ["high"].
 * 6. Call PATCH /shoppingMall/admin/adminSearch/adminNotifications using
 *    api.functional.shoppingMall.admin.adminSearch.adminNotifications.index
 *    with the request body above.
 * 7. Validate:
 *
 *    - The response conforms to IPageIShoppingMallAdminNotification.ISummary using
 *         typia.assert.
 *    - Pagination.current equals 1 and pagination.limit equals the requested limit.
 *    - For every item in data:
 *
 *         - Item.admin.id equals adminA.id.
 *         - Item.type === "risk_sla_violation".
 *         - Item.status === "unread".
 *         - Item.priority === "high" (for seeded data where we always set it).
 *    - At least one seeded notification that matches these filters appears in the
 *         result set (by matching id).
 * 8. Perform a second search with a filter combination that should yield zero
 *    results (e.g., a type that was not seeded for adminA) and assert that data
 *    is empty and pagination metadata indicates zero records.
 */
export async function test_api_admin_notification_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Join primary admin A
  const joinAdminA = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(joinAdminA);

  const adminAId = joinAdminA.id;

  // 2. Join secondary admin B
  const joinAdminB = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(joinAdminB);

  const adminBId = joinAdminB.id;

  // Fixed values for the filter scenario
  const targetType = "risk_sla_violation";
  const otherType = "refund_escalation";
  const targetStatus = "unread";
  const otherStatus = "read";
  const targetPriority = "high";
  const otherPriority = "normal";

  // 3. Seed notifications for admin A with varying combinations
  const matchingA1 =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminAId,
          type: targetType,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: targetStatus,
          priority: targetPriority,
          entity_type: "order",
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          entity_display: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(matchingA1);

  const matchingA2 =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminAId,
          type: targetType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: targetStatus,
          priority: targetPriority,
          entity_type: "risk_case",
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          entity_display: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(matchingA2);

  const nonMatchingTypeA =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminAId,
          type: otherType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: targetStatus,
          priority: targetPriority,
          entity_type: "order",
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          entity_display: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(nonMatchingTypeA);

  const nonMatchingStatusA =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminAId,
          type: targetType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: otherStatus,
          priority: targetPriority,
          entity_type: "order",
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          entity_display: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(nonMatchingStatusA);

  const nonMatchingPriorityA =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminAId,
          type: targetType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: targetStatus,
          priority: otherPriority,
          entity_type: "order",
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          entity_display: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(nonMatchingPriorityA);

  // 4. Seed notifications for admin B with the same combination so they must be excluded
  const matchingB =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminBId,
          type: targetType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: targetStatus,
          priority: targetPriority,
          entity_type: "order",
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          entity_display: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(matchingB);

  // 5. Build search request for admin A with type/status/priority filters
  const page = 1;
  const limit = 20;

  const searchBody = {
    page,
    limit,
    shopping_mall_admin_id: adminAId,
    types: [targetType],
    statuses: [targetStatus],
    priorities: [targetPriority],
  } satisfies IShoppingMallAdminNotification.IRequest;

  const pageResult =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      { body: searchBody },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(pageResult);

  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page should match request",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    pageResult.pagination.limit,
    limit,
  );

  // 8. Ensure all returned notifications satisfy filters and belong to admin A
  for (const item of pageResult.data) {
    TestValidator.equals(
      "notification admin should be adminA",
      item.admin.id,
      adminAId,
    );
    TestValidator.equals(
      "notification type should match filter",
      item.type,
      targetType,
    );
    TestValidator.equals(
      "notification status should match filter",
      item.status,
      targetStatus,
    );
    TestValidator.equals(
      "notification priority should match filter",
      item.priority,
      targetPriority,
    );
  }

  // 9. Confirm that at least one seeded matching notification id is present
  const seededIds = [matchingA1.id, matchingA2.id];
  const resultIds = pageResult.data.map((d) => d.id);

  const hasSeeded = seededIds.some((id) => resultIds.includes(id));
  TestValidator.predicate(
    "at least one seeded matching notification should be returned",
    hasSeeded,
  );

  // 10. Negative search that should result in empty list
  const negativeBody = {
    page,
    limit,
    shopping_mall_admin_id: adminAId,
    types: ["some_non_existing_type"],
  } satisfies IShoppingMallAdminNotification.IRequest;

  const negativeResult =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      { body: negativeBody },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(negativeResult);

  TestValidator.equals(
    "negative search should return zero records",
    negativeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "negative search should return zero pages",
    negativeResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "negative search should return empty data array",
    negativeResult.data.length,
    0,
  );
}
