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

export async function test_api_admin_notification_search_by_entity_context(
  connection: api.IConnection,
) {
  /**
   * Validate admin notification search filtering by polymorphic entity context.
   *
   * Business intent:
   *
   * - Admin notifications can be associated with various domain entities via the
   *   (entity_type, entity_id) pair and optionally richer relations like
   *   relatedRiskCase / relatedLegalHold.
   * - Admin consoles should be able to fetch a focused inbox for a particular
   *   entity by filtering on those polymorphic fields.
   *
   * Test workflow:
   *
   * 1. Join an admin via POST /auth/admin/join to obtain an authorized connection.
   * 2. Create one legal hold via POST /shoppingMall/admin/legalHolds.
   * 3. Create one risk case via POST /shoppingMall/admin/riskCases.
   * 4. Insert multiple notifications via POST
   *    /shoppingMall/admin/adminNotifications:
   *
   *    - A handful associated to the legal hold with entity_type "legal_hold" and
   *         entity_id = legal hold id.
   *    - A handful associated to the risk case with entity_type "risk_case" and
   *         entity_id = risk case id.
   *    - A couple of unrelated notifications with either null entity fields or a
   *         different entity_type.
   * 5. Call PATCH /shoppingMall/admin/adminNotifications with body { entity_type:
   *    "legal_hold", entity_id: legalHold.id }.
   *
   *    - Assert:
   *
   *         - Only notifications with entity_type === "legal_hold" and entity_id ===
   *                   legalHold.id are returned.
   *         - All returned summaries have consistent pagination metadata.
   * 6. Repeat with entity_type "risk_case" and entity_id = riskCase.id and assert
   *    equivalent behavior.
   */

  // 1. Join an admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const adminSummary: IShoppingMallAdmin.ISummary | undefined =
    adminAuthorized.admin;
  TestValidator.predicate(
    "joined admin has summary embedded",
    adminSummary !== undefined,
  );

  // Use the joined admin id as notification target
  const targetAdminId = adminAuthorized.id;

  // 2. Create legal hold
  const legalHoldCreate = {
    code: `LH-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: `CASE-${RandomGenerator.alphaNumeric(6)}`,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreate,
    });
  typia.assert(legalHold);

  // 3. Create risk case
  const riskCaseCreate = {
    case_code: `RC-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "high",
    primary_subject_type: "order",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: `ORDER-${RandomGenerator.alphaNumeric(6)}`,
    sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreate,
    });
  typia.assert(riskCase);

  // Helper to build notification bodies
  const buildNotificationCreate = (
    entityType: string | null,
    entityId: (string & tags.Format<"uuid">) | null,
    entityDisplay: string | null,
    overrides?: Partial<IShoppingMallAdminNotification.ICreate>,
  ): IShoppingMallAdminNotification.ICreate => {
    const base = {
      shopping_mall_admin_id: targetAdminId,
      related_risk_case_id: entityType === "risk_case" ? riskCase.id : null,
      related_legal_hold_id: entityType === "legal_hold" ? legalHold.id : null,
      type: entityType === null ? "general_info" : `${entityType}_alert`,
      title:
        entityType === "risk_case"
          ? "Risk case notification"
          : entityType === "legal_hold"
            ? "Legal hold notification"
            : "General notification",
      body: RandomGenerator.content({ paragraphs: 2 }),
      status: "unread",
      priority: "normal",
      entity_type: entityType,
      entity_id: entityId,
      entity_display: entityDisplay,
      read_at: null,
      archived_at: null,
    } satisfies IShoppingMallAdminNotification.ICreate;

    return {
      ...base,
      ...overrides,
    } satisfies IShoppingMallAdminNotification.ICreate;
  };

  // 4. Create notifications for each context
  const notifications: IShoppingMallAdminNotification[] = [];

  // Legal-hold scoped notifications
  const legalNotificationsBodies: IShoppingMallAdminNotification.ICreate[] =
    ArrayUtil.repeat(3, (index) =>
      buildNotificationCreate("legal_hold", legalHold.id, legalHold.code, {
        title: `Legal hold notification #${index + 1}`,
        priority: "high",
      }),
    );

  for (const body of legalNotificationsBodies) {
    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);
    notifications.push(created);
  }

  // Risk-case scoped notifications
  const riskNotificationsBodies: IShoppingMallAdminNotification.ICreate[] =
    ArrayUtil.repeat(2, (index) =>
      buildNotificationCreate("risk_case", riskCase.id, riskCase.case_code, {
        title: `Risk case notification #${index + 1}`,
        priority: "high",
      }),
    );

  for (const body of riskNotificationsBodies) {
    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);
    notifications.push(created);
  }

  // Unrelated notifications
  const unrelatedBodies: IShoppingMallAdminNotification.ICreate[] = [
    buildNotificationCreate(null, null, null, {
      title: "Unrelated general notification",
      priority: "low",
    }),
    buildNotificationCreate(
      "other_entity",
      typia.random<string & tags.Format<"uuid">>(),
      "OTHER-ENTITY",
      {
        title: "Other entity notification",
        priority: "normal",
      },
    ),
  ];

  for (const body of unrelatedBodies) {
    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);
    notifications.push(created);
  }

  TestValidator.predicate(
    "created at least one notification per entity context plus unrelated",
    notifications.length >= 3 + 2 + 2,
  );

  // Helper to run a scoped search and validate results
  const assertScopedSearch = async (
    title: string,
    entityType: string,
    entityId: string & tags.Format<"uuid">,
    expectedCount: number,
  ): Promise<void> => {
    const requestBody = {
      page: 1,
      limit: 50,
      shopping_mall_admin_id: targetAdminId,
      entity_type: entityType,
      entity_id: entityId,
      search: null,
      created_from: null,
      created_to: null,
      order_by: "created_at",
      order_direction: "desc",
    } satisfies IShoppingMallAdminNotification.IRequest;

    const page: IPageIShoppingMallAdminNotification.ISummary =
      await api.functional.shoppingMall.admin.adminNotifications.index(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(page);

    const pagination: IPage.IPagination = page.pagination;

    TestValidator.predicate(
      `${title} - pagination has non-negative fields`,
      pagination.current >= 0 &&
        pagination.limit >= 0 &&
        pagination.records >= 0 &&
        pagination.pages >= 0,
    );

    const data = page.data;

    // Every summary must match entity filter and admin
    for (const summary of data) {
      TestValidator.equals(
        `${title} - summary admin id matches target admin`,
        summary.admin.id,
        targetAdminId,
      );
      TestValidator.equals(
        `${title} - summary entity_type matches filter`,
        summary.entity_type ?? null,
        entityType,
      );
      TestValidator.equals(
        `${title} - summary entity_id matches filter`,
        summary.entity_id ?? null,
        entityId,
      );
    }

    TestValidator.predicate(
      `${title} - at least expectedCount notifications returned`,
      data.length >= expectedCount,
    );
  };

  // 5. Search for legal hold notifications by entity context
  await assertScopedSearch(
    "legal hold scoped search",
    "legal_hold",
    legalHold.id,
    legalNotificationsBodies.length,
  );

  // 6. Search for risk case notifications by entity context
  await assertScopedSearch(
    "risk case scoped search",
    "risk_case",
    riskCase.id,
    riskNotificationsBodies.length,
  );
}
