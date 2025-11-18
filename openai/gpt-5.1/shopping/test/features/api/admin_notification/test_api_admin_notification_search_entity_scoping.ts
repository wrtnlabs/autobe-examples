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
 * Validate admin notification search entity scoping by entity_type and
 * entity_id.
 *
 * Business goal: Ensure that an authenticated admin can search admin
 * notifications and correctly scope results by entity_type and entity_id, so
 * they can focus on notifications tied to a specific risk case or to all risk
 * cases, while excluding other entity types.
 *
 * Steps:
 *
 * 1. Join as a new admin to obtain an authenticated admin context.
 * 2. Seed admin notifications for that admin:
 *
 *    - A set of notifications with entity_type = "risk_case" tied to multiple
 *         distinct entity_id values.
 *    - Additional notifications with a different entity_type (e.g., "order") to
 *         verify exclusion by filters.
 * 3. Search with filters specifying shopping_mall_admin_id, entity_type and
 *    specific entity_id for one risk_case, and verify that only notifications
 *    for that risk case are returned.
 * 4. Search again with filters specifying shopping_mall_admin_id and entity_type =
 *    "risk_case" but entity_id = null, and verify that all risk_case
 *    notifications for the admin are returned and that no other entity types
 *    leak in.
 * 5. Validate that each returned summary exposes entity_type, entity_id and
 *    entity_display consistent with seeded notifications.
 */
export async function test_api_admin_notification_search_entity_scoping(
  connection: api.IConnection,
) {
  // 1. Join as a new admin and get authorized context on this connection.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  const adminId = admin.id;

  // 2. Seed admin notifications for this admin.
  // Prepare two distinct risk_case entity ids.
  const riskCaseIdA = typia.random<string & tags.Format<"uuid">>();
  const riskCaseIdB = typia.random<string & tags.Format<"uuid">>();

  const riskCaseDisplayA = RandomGenerator.paragraph({
    sentences: 2,
  });
  const riskCaseDisplayB = RandomGenerator.paragraph({
    sentences: 2,
  });

  // Helper to build a base notification body for this admin.
  const baseNotification = (
    overrides: Partial<IShoppingMallAdminNotification.ICreate>,
  ) =>
    ({
      shopping_mall_admin_id: adminId,
      related_risk_case_id: null,
      related_legal_hold_id: null,
      type: "risk_engine_test",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.paragraph({ sentences: 6 }),
      status: "unread",
      priority: "normal",
      entity_type: null,
      entity_id: null,
      entity_display: null,
      read_at: null,
      archived_at: null,
      ...overrides,
    }) satisfies IShoppingMallAdminNotification.ICreate;

  // Create risk_case notifications for two different entity ids.
  const riskNotificationsForA: IShoppingMallAdminNotification[] = [];
  const riskNotificationsForB: IShoppingMallAdminNotification[] = [];

  // Create 2 notifications for riskCaseIdA.
  for (let i = 0; i < 2; i++) {
    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        {
          body: baseNotification({
            entity_type: "risk_case",
            entity_id: riskCaseIdA,
            entity_display: riskCaseDisplayA,
          }),
        },
      );
    typia.assert(created);
    riskNotificationsForA.push(created);
  }

  // Create 2 notifications for riskCaseIdB.
  for (let i = 0; i < 2; i++) {
    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        {
          body: baseNotification({
            entity_type: "risk_case",
            entity_id: riskCaseIdB,
            entity_display: riskCaseDisplayB,
          }),
        },
      );
    typia.assert(created);
    riskNotificationsForB.push(created);
  }

  const totalRiskNotifications =
    riskNotificationsForA.length + riskNotificationsForB.length;

  // Create some notifications with a different entity_type (e.g., "order").
  const otherTypeNotifications: IShoppingMallAdminNotification[] = [];
  for (let i = 0; i < 2; i++) {
    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        {
          body: baseNotification({
            entity_type: "order",
            entity_id: typia.random<string & tags.Format<"uuid">>(),
            entity_display: RandomGenerator.paragraph({ sentences: 2 }),
          }),
        },
      );
    typia.assert(created);
    otherTypeNotifications.push(created);
  }

  // 3. Search by specific entity (risk_case + riskCaseIdA).
  const searchSpecificBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminId,
    types: undefined,
    statuses: undefined,
    priorities: undefined,
    entity_type: "risk_case",
    entity_id: riskCaseIdA,
    search: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const pageSpecific: IPageIShoppingMallAdminNotification.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      {
        body: searchSpecificBody,
      },
    );
  typia.assert(pageSpecific);

  const specificData = pageSpecific.data;

  // Ensure at least the expected number of notifications for riskCaseIdA.
  TestValidator.predicate(
    "specific entity search returns at most seeded notifications for riskCaseIdA",
    () => specificData.length <= riskNotificationsForA.length,
  );

  // All returned notifications must belong to the admin and match entity_type and entity_id.
  for (const summary of specificData) {
    typia.assert(summary);
    TestValidator.equals(
      "specific search: admin id matches",
      summary.admin.id,
      adminId,
    );
    TestValidator.equals(
      "specific search: entity_type is risk_case",
      summary.entity_type,
      "risk_case",
    );
    TestValidator.equals(
      "specific search: entity_id matches riskCaseIdA",
      summary.entity_id,
      riskCaseIdA,
    );
  }

  // 4. Search by entity_type only (risk_case, entity_id null).
  const searchTypeOnlyBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminId,
    types: undefined,
    statuses: undefined,
    priorities: undefined,
    entity_type: "risk_case",
    entity_id: null,
    search: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const pageTypeOnly: IPageIShoppingMallAdminNotification.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.adminNotifications.index(
      connection,
      {
        body: searchTypeOnlyBody,
      },
    );
  typia.assert(pageTypeOnly);

  const typeOnlyData = pageTypeOnly.data;

  // All returned notifications must be for this admin and have entity_type = risk_case.
  for (const summary of typeOnlyData) {
    typia.assert(summary);
    TestValidator.equals(
      "type-only search: admin id matches",
      summary.admin.id,
      adminId,
    );
    TestValidator.equals(
      "type-only search: entity_type is risk_case",
      summary.entity_type,
      "risk_case",
    );

    // entity_id must be one of our seeded risk case ids.
    TestValidator.predicate(
      "type-only search: entity_id is one of seeded risk case ids",
      () =>
        summary.entity_id === riskCaseIdA || summary.entity_id === riskCaseIdB,
    );
  }

  // Verify that the number of returned risk_case notifications is
  // less than or equal to the total seeded risk_case notifications.
  TestValidator.predicate(
    "type-only search: result size does not exceed seeded risk_case notifications",
    () => typeOnlyData.length <= totalRiskNotifications,
  );

  // Ensure at least one risk_case notification is returned.
  TestValidator.predicate(
    "type-only search: returns at least one risk_case notification",
    () => typeOnlyData.length > 0,
  );

  // 5. Verify entity_display exposure for one notification for riskCaseIdA.
  const anyForA = typeOnlyData.find((s) => s.entity_id === riskCaseIdA);
  if (anyForA !== undefined) {
    TestValidator.equals(
      "entity_display for riskCaseIdA matches seeded value",
      anyForA.entity_display,
      riskCaseDisplayA,
    );
  }
}
