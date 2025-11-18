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
 * Validate that admin notification search is isolated per admin.
 *
 * Business goal:
 *
 * - When multiple admin accounts exist and each has its own notifications, PATCH
 *   /shoppingMall/admin/adminNotifications must only return notifications
 *   belonging to the currently authenticated admin, never leaking other admins'
 *   notifications.
 *
 * High level flow:
 *
 * 1. Join Admin A (POST /auth/admin/join) and capture its id.
 * 2. Join Admin B (POST /auth/admin/join) and capture its id.
 * 3. Authenticate as Admin A on a dedicated connection and create several
 *    notifications whose shopping_mall_admin_id is Admin A's id.
 * 4. Authenticate as Admin B on a dedicated connection and create several
 *    notifications whose shopping_mall_admin_id is Admin B's id.
 * 5. As Admin A, search notifications via PATCH
 *    /shoppingMall/admin/adminNotifications and assert all returned
 *    notifications belong to Admin A only and do not include Admin B's
 *    notifications.
 * 6. As Admin B, search notifications and assert all returned notifications belong
 *    to Admin B only and do not include Admin A's notifications.
 */
export async function test_api_admin_notification_search_multi_admin_isolation(
  connection: api.IConnection,
) {
  // Helper to create notifications for a given admin using a specific connection
  const createNotificationsForAdmin = async (
    conn: api.IConnection,
    adminId: string & tags.Format<"uuid">,
    count: number,
  ): Promise<IShoppingMallAdminNotification[]> => {
    const created: IShoppingMallAdminNotification[] = [];
    for (let i = 0; i < count; i++) {
      const body = {
        shopping_mall_admin_id: adminId,
        related_risk_case_id: null,
        related_legal_hold_id: null,
        type: RandomGenerator.alphabets(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.paragraph({ sentences: 6 }),
        status: "unread",
        priority: "normal",
        entity_type: null,
        entity_id: null,
        entity_display: null,
        read_at: null,
        archived_at: null,
      } satisfies IShoppingMallAdminNotification.ICreate;

      const notif: IShoppingMallAdminNotification =
        await api.functional.shoppingMall.admin.adminNotifications.create(
          conn,
          { body },
        );
      typia.assert(notif);
      created.push(notif);
    }
    return created;
  };

  // Clone the incoming connection to create two independent admin connections
  const adminAConn: api.IConnection = { ...connection };
  const adminBConn: api.IConnection = { ...connection };

  // 1. Join Admin A on its dedicated connection
  const adminAJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminAConn, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);
  const adminAId = adminA.id;

  // 2. Join Admin B on its dedicated connection
  const adminBJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminBConn, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);
  const adminBId = adminB.id;

  // 3. Create notifications for Admin A (authenticated as Admin A on adminAConn)
  const adminANotifications: IShoppingMallAdminNotification[] =
    await createNotificationsForAdmin(adminAConn, adminAId, 3);

  // 4. Create notifications for Admin B (authenticated as Admin B on adminBConn)
  const adminBNotifications: IShoppingMallAdminNotification[] =
    await createNotificationsForAdmin(adminBConn, adminBId, 2);

  // 5. Search as Admin A: only Admin A's notifications must appear
  const searchBodyForAdminA = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminAId,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const pageForAdminA: IPageIShoppingMallAdminNotification.ISummary =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      adminAConn,
      { body: searchBodyForAdminA },
    );
  typia.assert(pageForAdminA);

  TestValidator.predicate(
    "admin A search should return at least the created notifications",
    pageForAdminA.data.length >= adminANotifications.length,
  );

  for (const summary of pageForAdminA.data) {
    TestValidator.equals(
      "each notification in Admin A search belongs to Admin A",
      summary.admin.id,
      adminAId,
    );
  }

  const adminBIds = new Set(adminBNotifications.map((n) => n.id));
  for (const summary of pageForAdminA.data) {
    TestValidator.predicate(
      "Admin A search does not contain Admin B notifications",
      adminBIds.has(summary.id) === false,
    );
  }

  // 6. Search as Admin B: only Admin B's notifications must appear
  const searchBodyForAdminB = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminBId,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const pageForAdminB: IPageIShoppingMallAdminNotification.ISummary =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      adminBConn,
      { body: searchBodyForAdminB },
    );
  typia.assert(pageForAdminB);

  TestValidator.predicate(
    "admin B search should return at least the created notifications",
    pageForAdminB.data.length >= adminBNotifications.length,
  );

  for (const summary of pageForAdminB.data) {
    TestValidator.equals(
      "each notification in Admin B search belongs to Admin B",
      summary.admin.id,
      adminBId,
    );
  }

  const adminAIds = new Set(adminANotifications.map((n) => n.id));
  for (const summary of pageForAdminB.data) {
    TestValidator.predicate(
      "Admin B search does not contain Admin A notifications",
      adminAIds.has(summary.id) === false,
    );
  }
}
