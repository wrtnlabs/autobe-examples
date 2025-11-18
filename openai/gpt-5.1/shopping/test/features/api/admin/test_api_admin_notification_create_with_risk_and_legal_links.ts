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

export async function test_api_admin_notification_create_with_risk_and_legal_links(
  connection: api.IConnection,
) {
  // 1. Register an admin actor via /auth/admin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminSummary = adminAuthorized.admin;
  typia.assert<IShoppingMallAdmin.ISummary | undefined>(adminSummary);

  // Ensure we have an admin summary to compare against
  await TestValidator.predicate(
    "admin summary exists",
    () => adminSummary !== undefined,
  );

  const adminId: string & tags.Format<"uuid"> = adminSummary!.id;

  // 2. Create a risk case linked to some primary subject
  const riskCaseBody = {
    case_code: `RC-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "open",
    severity: RandomGenerator.pick(["low", "medium", "high"] as const),
    primary_subject_type: "order",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: `ORDER-${RandomGenerator.alphaNumeric(10)}`,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert<IShoppingMallRiskCase>(riskCase);

  const riskSummaryExpected: IShoppingMallRiskCase.ISummary = {
    id: riskCase.id,
    case_code: riskCase.case_code,
    title: riskCase.title,
    status: riskCase.status,
    severity: riskCase.severity,
    primary_subject_type: riskCase.primary_subject_type,
    primary_subject_id: riskCase.primary_subject_id,
    primary_subject_display: riskCase.primary_subject_display,
    sla_due_at: riskCase.sla_due_at,
    closed_at: riskCase.closed_at,
    created_at: riskCase.created_at,
    updated_at: riskCase.updated_at,
  } satisfies IShoppingMallRiskCase.ISummary;

  // 3. Create a legal hold
  const effectiveFrom = new Date();
  const legalHoldBody = {
    code: `LH-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    scope_description:
      "All events and records associated with the linked risk case.",
    external_reference: `CASE-${RandomGenerator.alphaNumeric(6)}`,
    effective_from: effectiveFrom.toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert<IShoppingMallLegalHold>(legalHold);

  const legalSummaryExpected: IShoppingMallLegalHold.ISummary = {
    id: legalHold.id,
    code: legalHold.code,
    title: legalHold.title,
    status: legalHold.status,
    created_by_admin_id: legalHold.created_by_admin_id,
    created_by_admin: legalHold.created_by_admin,
    released_by_admin_id: legalHold.released_by_admin_id,
    released_by_admin: legalHold.released_by_admin,
    effective_from: legalHold.effective_from,
    released_at: legalHold.released_at,
    created_at: legalHold.created_at,
    updated_at: legalHold.updated_at,
  } satisfies IShoppingMallLegalHold.ISummary;

  // 4. Create an admin notification linking both risk case and legal hold
  const notificationBody = {
    shopping_mall_admin_id: adminId,
    related_risk_case_id: riskCase.id,
    related_legal_hold_id: legalHold.id,
    type: "risk_and_legal_alert",
    title: "Risk case and legal hold require joint review",
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "unread",
    priority: "high",
    entity_type: "risk_case",
    entity_id: riskCase.id,
    entity_display: riskCase.case_code,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const notification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: notificationBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(notification);

  // 5. Business-level wiring validations
  // 5-1. Admin summary wiring
  await TestValidator.predicate(
    "notification admin summary is present",
    () => notification.admin !== undefined,
  );

  const notifAdmin = notification.admin!;
  TestValidator.equals(
    "notification admin id should match created admin",
    notifAdmin.id,
    adminSummary!.id,
  );
  TestValidator.equals(
    "notification admin email should match created admin",
    notifAdmin.email,
    adminSummary!.email,
  );
  TestValidator.equals(
    "notification admin status should match created admin",
    notifAdmin.status,
    adminSummary!.status,
  );

  // 5-2. Risk case summary wiring
  await TestValidator.predicate(
    "notification relatedRiskCase is populated",
    () =>
      notification.relatedRiskCase !== undefined &&
      notification.relatedRiskCase !== null,
  );

  const notifRisk = notification.relatedRiskCase!;
  TestValidator.equals(
    "risk case id should match",
    notifRisk.id,
    riskSummaryExpected.id,
  );
  TestValidator.equals(
    "risk case code should match",
    notifRisk.case_code,
    riskSummaryExpected.case_code,
  );
  TestValidator.equals(
    "risk case title should match",
    notifRisk.title,
    riskSummaryExpected.title,
  );
  TestValidator.equals(
    "risk case status should match",
    notifRisk.status,
    riskSummaryExpected.status,
  );
  TestValidator.equals(
    "risk case severity should match",
    notifRisk.severity,
    riskSummaryExpected.severity,
  );

  // 5-3. Legal hold summary wiring
  await TestValidator.predicate(
    "notification relatedLegalHold is populated",
    () =>
      notification.relatedLegalHold !== undefined &&
      notification.relatedLegalHold !== null,
  );

  const notifLegal = notification.relatedLegalHold!;
  TestValidator.equals(
    "legal hold id should match",
    notifLegal.id,
    legalSummaryExpected.id,
  );
  TestValidator.equals(
    "legal hold code should match",
    notifLegal.code,
    legalSummaryExpected.code,
  );
  TestValidator.equals(
    "legal hold title should match",
    notifLegal.title,
    legalSummaryExpected.title,
  );
  TestValidator.equals(
    "legal hold status should match",
    notifLegal.status,
    legalSummaryExpected.status,
  );

  // 5-4. Notification field echoes
  TestValidator.equals(
    "notification type should echo input",
    notification.type,
    notificationBody.type,
  );
  TestValidator.equals(
    "notification title should echo input",
    notification.title,
    notificationBody.title,
  );
  TestValidator.equals(
    "notification status should be unread",
    notification.status,
    notificationBody.status,
  );
  TestValidator.equals(
    "notification priority should echo input",
    notification.priority,
    notificationBody.priority,
  );
  TestValidator.equals(
    "notification entity_type should echo input",
    notification.entity_type,
    notificationBody.entity_type,
  );
  TestValidator.equals(
    "notification entity_id should echo input",
    notification.entity_id,
    notificationBody.entity_id,
  );
  TestValidator.equals(
    "notification entity_display should echo input",
    notification.entity_display,
    notificationBody.entity_display,
  );
}
