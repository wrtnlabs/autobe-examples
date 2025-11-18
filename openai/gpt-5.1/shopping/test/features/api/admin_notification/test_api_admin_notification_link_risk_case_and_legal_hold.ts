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

export async function test_api_admin_notification_link_risk_case_and_legal_hold(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;

  // 2. Create a risk case
  const riskCaseBody = {
    case_code: `RC-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    primary_subject_type: "customer",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
    sla_due_at: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert<IShoppingMallRiskCase>(riskCase);

  const riskCaseId: string & tags.Format<"uuid"> = riskCase.id;
  const riskCaseCode: string = riskCase.case_code;

  // 3. Create a legal hold
  const legalHoldBody = {
    code: `LH-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(10),
    effective_from: new Date().toISOString() as string &
      tags.Format<"date-time">,
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert<IShoppingMallLegalHold>(legalHold);

  const legalHoldId: string & tags.Format<"uuid"> = legalHold.id;

  // 4. Create a base admin notification without risk/legal links
  const baseNotificationBody = {
    shopping_mall_admin_id: adminId,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "generic_info",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    status: "unread",
    priority: "normal",
    entity_type: "system_event",
    entity_id: typia.random<string & tags.Format<"uuid">>(),
    entity_display: RandomGenerator.paragraph({ sentences: 2 }),
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const baseNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: baseNotificationBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(baseNotification);

  const notificationId: string & tags.Format<"uuid"> = baseNotification.id;

  // 5. Update the notification to link risk case and legal hold and align entity_* to risk case
  const updateBody = {
    related_risk_case_id: riskCaseId,
    related_legal_hold_id: legalHoldId,
    entity_type: "risk_case",
    entity_id: riskCaseId,
    entity_display: riskCaseCode,
  } satisfies IShoppingMallAdminNotification.IUpdate;

  const updatedNotification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.update(
      connection,
      {
        adminNotificationId: notificationId,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(updatedNotification);

  // 6. Business validations
  TestValidator.equals(
    "notification id must remain the same after update",
    updatedNotification.id,
    baseNotification.id,
  );

  // relatedRiskCase and relatedLegalHold summaries should be non-null after linking
  TestValidator.predicate(
    "updated notification must have relatedRiskCase summary",
    updatedNotification.relatedRiskCase !== null &&
      updatedNotification.relatedRiskCase !== undefined,
  );

  TestValidator.predicate(
    "updated notification must have relatedLegalHold summary",
    updatedNotification.relatedLegalHold !== null &&
      updatedNotification.relatedLegalHold !== undefined,
  );

  // Primitive foreign key reflections via entity_* fields
  TestValidator.equals(
    "entity_type updated to risk_case",
    updatedNotification.entity_type,
    "risk_case",
  );

  TestValidator.equals(
    "entity_id updated to risk case id",
    updatedNotification.entity_id,
    riskCaseId,
  );

  TestValidator.equals(
    "entity_display updated to risk case code",
    updatedNotification.entity_display,
    riskCaseCode,
  );

  // Ensure other core properties remain unchanged (type, title, status, priority)
  TestValidator.equals(
    "notification type remains unchanged",
    updatedNotification.type,
    baseNotification.type,
  );

  TestValidator.equals(
    "notification title remains unchanged",
    updatedNotification.title,
    baseNotification.title,
  );

  TestValidator.equals(
    "notification status remains unchanged",
    updatedNotification.status,
    baseNotification.status,
  );

  TestValidator.equals(
    "notification priority remains unchanged",
    updatedNotification.priority,
    baseNotification.priority,
  );

  // created_at should remain the same, updated_at can change
  TestValidator.equals(
    "created_at remains unchanged",
    updatedNotification.created_at,
    baseNotification.created_at,
  );
}
