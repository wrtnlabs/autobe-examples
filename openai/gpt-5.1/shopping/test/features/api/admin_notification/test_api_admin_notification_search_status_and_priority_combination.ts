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
 * Verify admin notification search can combine status, priority, and type
 * filters.
 *
 * Business goal:
 *
 * - Ensure PATCH /shoppingMall/admin/adminSearch/adminNotifications correctly
 *   applies intersection filters on type, status, and priority so admins can
 *   build focused work queues like "high-priority unread risk alerts".
 * - Confirm that removing one dimension (priority) broadens the result set as
 *   expected.
 *
 * Steps:
 *
 * 1. Register an admin through auth.admin.join and capture the admin id.
 * 2. Create a set of notifications for that admin via
 *    shoppingMall.admin.adminNotifications.create:
 *
 *    - N1, N2: type=risk_sla_violation, status=unread, priority=high
 *    - N3: type=risk_sla_violation, status=unread, priority=normal
 *    - N4: type=risk_sla_violation, status=read, priority=high
 *    - N5: type=other_type (e.g., seller_approval_needed), status=unread,
 *         priority=high
 * 3. Call adminSearch.adminNotifications.index with body specifying:
 *    shopping_mall_admin_id = admin.id types = ["risk_sla_violation"] statuses
 *    = ["unread"] priorities = ["high"] page = 1, limit large enough (e.g.,
 *    20)
 * 4. Assert:
 *
 *    - All returned notifications have type "risk_sla_violation", status "unread",
 *         priority "high".
 *    - The set of returned ids exactly matches {N1.id, N2.id} (i.e., does not
 *         include N3, N4, N5).
 *    - Pagination.records equals data.length and at least 2.
 * 5. Call adminSearch.adminNotifications.index again with the same body except
 *    priorities is omitted (or left undefined) while keeping types and
 *    statuses.
 * 6. Assert:
 *
 *    - All returned notifications have type "risk_sla_violation" and status
 *         "unread".
 *    - The returned ids include N1.id, N2.id, and N3.id.
 *    - Data.length is greater than or equal to the count from step 4 and strictly
 *         greater than 2.
 */
export async function test_api_admin_notification_search_status_and_priority_combination(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Create notifications matrix for this admin
  const baseEntityId = typia.random<string & tags.Format<"uuid">>();
  const baseEntityDisplay = RandomGenerator.paragraph({ sentences: 3 });

  const n1: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "risk_sla_violation",
          title: "Risk SLA breach - high priority #1",
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: "unread",
          priority: "high",
          entity_type: "risk_case",
          entity_id: baseEntityId,
          entity_display: baseEntityDisplay,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert(n1);

  const n2: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "risk_sla_violation",
          title: "Risk SLA breach - high priority #2",
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: "unread",
          priority: "high",
          entity_type: "risk_case",
          entity_id: baseEntityId,
          entity_display: baseEntityDisplay,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert(n2);

  const n3: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "risk_sla_violation",
          title: "Risk SLA breach - normal priority",
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: "unread",
          priority: "normal",
          entity_type: "risk_case",
          entity_id: baseEntityId,
          entity_display: baseEntityDisplay,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert(n3);

  const n4: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "risk_sla_violation",
          title: "Risk SLA breach - read high priority",
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: "read",
          priority: "high",
          entity_type: "risk_case",
          entity_id: baseEntityId,
          entity_display: baseEntityDisplay,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert(n4);

  const n5: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "seller_approval_needed",
          title: "Seller approval pending - high priority",
          body: RandomGenerator.content({ paragraphs: 1 }),
          status: "unread",
          priority: "high",
          entity_type: "seller",
          entity_id: typia.random<string & tags.Format<"uuid">>(),
          entity_display: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert(n5);

  // 3. Search with type + status + priority filters
  const filteredHighOnly: IPageIShoppingMallAdminNotification.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          types: ["risk_sla_violation"],
          statuses: ["unread"],
          priorities: ["high"],
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallAdminNotification.IRequest,
      },
    );
  typia.assert(filteredHighOnly);

  const highOnlyIds: string[] = filteredHighOnly.data.map((item) => item.id);

  // Ensure at least our two high-priority unread risk notifications are present
  TestValidator.predicate(
    "high-only search returns at least two results",
    () => highOnlyIds.length >= 2,
  );

  // All items must match the filters
  filteredHighOnly.data.forEach((item) => {
    TestValidator.equals(
      "filtered item has correct type",
      item.type,
      "risk_sla_violation",
    );
    TestValidator.equals(
      "filtered item has unread status",
      item.status,
      "unread",
    );
    TestValidator.equals(
      "filtered item has high priority",
      item.priority,
      "high",
    );
  });

  // Ensure N1 and N2 are included
  TestValidator.predicate("N1 is included in high-only search", () =>
    highOnlyIds.includes(n1.id),
  );
  TestValidator.predicate("N2 is included in high-only search", () =>
    highOnlyIds.includes(n2.id),
  );

  // Ensure N3, N4, N5 are excluded by the combination filters
  TestValidator.predicate(
    "N3 (normal priority) is excluded from high-only search",
    () => !highOnlyIds.includes(n3.id),
  );
  TestValidator.predicate(
    "N4 (read status) is excluded from high-only search",
    () => !highOnlyIds.includes(n4.id),
  );
  TestValidator.predicate(
    "N5 (different type) is excluded from high-only search",
    () => !highOnlyIds.includes(n5.id),
  );

  // Pagination sanity checks
  TestValidator.equals(
    "pagination current page is 1 for high-only search",
    filteredHighOnly.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records >= data length for high-only search",
    () => filteredHighOnly.pagination.records >= filteredHighOnly.data.length,
  );

  // 5. Search again without priority filter (type + status only)
  const filteredWithoutPriority: IPageIShoppingMallAdminNotification.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          types: ["risk_sla_violation"],
          statuses: ["unread"],
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallAdminNotification.IRequest,
      },
    );
  typia.assert(filteredWithoutPriority);

  const withoutPriorityIds: string[] = filteredWithoutPriority.data.map(
    (item) => item.id,
  );

  // All results must still match type and status but can have any priority
  filteredWithoutPriority.data.forEach((item) => {
    TestValidator.equals(
      "no-priority filter item has correct type",
      item.type,
      "risk_sla_violation",
    );
    TestValidator.equals(
      "no-priority filter item has unread status",
      item.status,
      "unread",
    );
  });

  // Should include N1, N2, and N3
  TestValidator.predicate("N1 is included without-priority search", () =>
    withoutPriorityIds.includes(n1.id),
  );
  TestValidator.predicate("N2 is included without-priority search", () =>
    withoutPriorityIds.includes(n2.id),
  );
  TestValidator.predicate("N3 is included without-priority search", () =>
    withoutPriorityIds.includes(n3.id),
  );

  // Should still exclude N4 and N5, since status/type filters unchanged
  TestValidator.predicate(
    "N4 (read) is excluded from no-priority search",
    () => !withoutPriorityIds.includes(n4.id),
  );
  TestValidator.predicate(
    "N5 (different type) is excluded from no-priority search",
    () => !withoutPriorityIds.includes(n5.id),
  );

  // Verify that removing the priority filter broadens (or at least not shrinks) result set
  TestValidator.predicate(
    "result set without priority is at least as large as with high-only",
    () => withoutPriorityIds.length >= highOnlyIds.length,
  );
  TestValidator.predicate(
    "result set without priority is strictly larger (contains N3)",
    () => withoutPriorityIds.length > highOnlyIds.length,
  );
}
