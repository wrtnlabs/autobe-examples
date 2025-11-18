import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate admin notification detail with linked risk case and legal hold.
 *
 * Business goal: Ensure that when an admin notification is created with both
 * related_risk_case_id and related_legal_hold_id pointing to existing
 * IShoppingMallRiskCase and IShoppingMallLegalHold records, the detail endpoint
 * GET /shoppingMall/admin/adminNotifications/{adminNotificationId} returns an
 * IShoppingMallAdminNotification whose relatedRiskCase and relatedLegalHold
 * associations are non-null and consistent with the underlying entities. Also
 * confirm that core scalar fields and admin summary information are preserved
 * correctly.
 *
 * High level steps:
 *
 * 1. Join an admin to obtain an authenticated admin context.
 * 2. Create a legal hold.
 * 3. Create a risk case.
 * 4. Create an admin notification that references both the legal hold and risk
 *    case, targeting the joined admin.
 * 5. Fetch the notification detail by id.
 * 6. Validate that relatedRiskCase and relatedLegalHold summaries are populated
 *    and consistent, and that scalar fields are preserved.
 */
export async function test_api_admin_notification_detail_with_risk_case_and_legal_hold_links(
  connection: api.IConnection,
) {
  // 1. Admin join to get authorized admin and token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Create legal hold
  const legalHoldBody = {
    code: `LH-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: `CASE-${RandomGenerator.alphaNumeric(6)}`,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 3. Create risk case
  const riskCaseBody = {
    case_code: `RC-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: "high",
    primary_subject_type: "order",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: `ORDER-${RandomGenerator.alphaNumeric(6)}`,
    sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert(riskCase);

  // 4. Create admin notification linking both legal hold and risk case
  const notificationCreateBody = {
    shopping_mall_admin_id: adminId,
    related_risk_case_id: riskCase.id,
    related_legal_hold_id: legalHold.id,
    type: "risk_legal_linked_case",
    title: "Risk case linked to legal hold",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    status: "unread",
    priority: "high",
    entity_type: "risk_case",
    entity_id: riskCase.id,
    entity_display: riskCase.case_code,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const createdNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: notificationCreateBody },
    );
  typia.assert(createdNotification);

  // 5. Fetch notification detail by id
  const detailed: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.at(connection, {
      adminNotificationId: createdNotification.id,
    });
  typia.assert(detailed);

  // 6. Business validations

  // 6.1 Ensure linked risk case summary is present and matches
  TestValidator.predicate(
    "relatedRiskCase summary should be present",
    detailed.relatedRiskCase !== null && detailed.relatedRiskCase !== undefined,
  );

  if (
    detailed.relatedRiskCase !== null &&
    detailed.relatedRiskCase !== undefined
  ) {
    TestValidator.equals(
      "relatedRiskCase.id matches risk case id",
      detailed.relatedRiskCase.id,
      riskCase.id,
    );
    TestValidator.equals(
      "relatedRiskCase.case_code matches risk case case_code",
      detailed.relatedRiskCase.case_code,
      riskCase.case_code,
    );
  }

  // 6.2 Ensure linked legal hold summary is present and matches
  TestValidator.predicate(
    "relatedLegalHold summary should be present",
    detailed.relatedLegalHold !== null &&
      detailed.relatedLegalHold !== undefined,
  );

  if (
    detailed.relatedLegalHold !== null &&
    detailed.relatedLegalHold !== undefined
  ) {
    TestValidator.equals(
      "relatedLegalHold.id matches legal hold id",
      detailed.relatedLegalHold.id,
      legalHold.id,
    );
    TestValidator.equals(
      "relatedLegalHold.code matches legal hold code",
      detailed.relatedLegalHold.code,
      legalHold.code,
    );
  }

  // 6.3 Admin summary should be present and match joined admin id
  TestValidator.predicate(
    "admin summary should be present on notification detail",
    detailed.admin !== undefined,
  );

  if (detailed.admin !== undefined) {
    TestValidator.equals(
      "admin summary id matches joined admin id",
      detailed.admin.id,
      adminId,
    );
  }

  // 6.4 Core scalar fields should be preserved
  TestValidator.equals(
    "notification type is preserved",
    detailed.type,
    notificationCreateBody.type,
  );
  TestValidator.equals(
    "notification title is preserved",
    detailed.title,
    notificationCreateBody.title,
  );
  TestValidator.equals(
    "notification status is preserved",
    detailed.status,
    notificationCreateBody.status,
  );
  TestValidator.equals(
    "notification priority is preserved",
    detailed.priority,
    notificationCreateBody.priority,
  );

  // 6.5 Entity linkage fields should be preserved
  TestValidator.equals(
    "entity_type is preserved",
    detailed.entity_type,
    notificationCreateBody.entity_type,
  );
  TestValidator.equals(
    "entity_id is preserved",
    detailed.entity_id,
    notificationCreateBody.entity_id,
  );
  TestValidator.equals(
    "entity_display is preserved",
    detailed.entity_display,
    notificationCreateBody.entity_display,
  );
}
