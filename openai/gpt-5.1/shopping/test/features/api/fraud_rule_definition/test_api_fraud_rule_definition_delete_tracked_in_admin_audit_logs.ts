import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionAudit";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_delete_tracked_in_admin_audit_logs(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain an authenticated session.
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a fraud rule definition with a deterministic, unique ruleCode.
  const ruleCode = `E2E_DELETE_TEST_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    ruleCode,
    name: `Delete audit tracking for ${ruleCode}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    scope: "order",
    severity: "high",
    ruleExpression: JSON.stringify({
      when: "totalAmount > 100000",
      then: "flag_suspicious",
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);

  // Capture a baseline timestamp after rule creation to bound our audit search.
  const deleteBaselineAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 3. Delete the fraud rule definition by its business ruleCode.
  await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
    connection,
    {
      ruleCode,
    },
  );

  // Small time window: use current time as an upper bound for audit search.
  const auditSearchUpperBound: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 4. Query admin action audits filtered by this admin and by a narrow time window.
  const auditRequest: IShoppingMallAdminActionAudit.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "created_at",
    sortDirection: "desc",
    adminId: admin.id,
    occurredFrom: deleteBaselineAt,
    occurredTo: auditSearchUpperBound,
    createdFrom: deleteBaselineAt,
    createdTo: auditSearchUpperBound,
    search: ruleCode,
  };

  const auditPage: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminActionAudits.index(
      connection,
      {
        body: auditRequest,
      },
    );
  typia.assert(auditPage);

  const pagination: IPage.IPagination = auditPage.pagination;
  typia.assert(pagination);

  const audits: IShoppingMallAdminActionAudit.ISummary[] = auditPage.data;

  // 5. Business assertions
  // 5-1. There should be at least one audit entry in the response window.
  TestValidator.predicate(
    "at least one admin action audit exists for this window",
    audits.length > 0,
  );

  // 5-2. At least one audit row must belong to the acting admin.
  const auditsForAdmin = audits.filter(
    (row) => row.platformadmin_id === admin.id,
  );

  TestValidator.predicate(
    "at least one audit entry belongs to the acting platform admin",
    auditsForAdmin.length > 0,
  );

  // 5-3. Among those audits for this admin, we expect at least one where
  // the summary_message references the ruleCode or the target_id equals
  // the created rule's primary id. We rely on either or both conventions.
  const relatedToRule = auditsForAdmin.filter((row) => {
    const mentionsRuleCode = row.summary_message.includes(ruleCode);
    const matchesTargetId = row.target_id === createdRule.id;
    return mentionsRuleCode || matchesTargetId;
  });

  TestValidator.predicate(
    "an audit entry exists that is related to the deleted fraud rule definition",
    relatedToRule.length > 0,
  );

  // 5-4. Sanity check that the audit records we consider related are not
  // older than our lower bound (defensive check on created_at).
  const createdAtWithinWindow = relatedToRule.every((row) => {
    return (
      row.created_at >= deleteBaselineAt &&
      row.created_at <= auditSearchUpperBound
    );
  });

  TestValidator.predicate(
    "related audit entries have created_at within the expected time window",
    createdAtWithinWindow,
  );
}
