import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_admin_risk_case_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create baseline risk case with deterministic key fields
  const caseCode = RandomGenerator.alphaNumeric(16);
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 4 });
  const initialStatus = "open";
  const initialSeverity = "medium";
  const initialPrimarySubjectType = "seller";
  const initialPrimarySubjectId = typia.random<string & tags.Format<"uuid">>();
  const initialPrimarySubjectDisplay = RandomGenerator.paragraph({
    sentences: 2,
  });

  const createBody = {
    case_code: caseCode,
    title: initialTitle,
    description: initialDescription,
    status: initialStatus,
    severity: initialSeverity,
    primary_subject_type: initialPrimarySubjectType,
    primary_subject_id: initialPrimarySubjectId,
    primary_subject_display: initialPrimarySubjectDisplay,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const before: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: createBody,
    });
  typia.assert(before);

  // Sanity check: core fields match what we sent
  TestValidator.equals("created case_code matches", before.case_code, caseCode);
  TestValidator.equals("created title matches", before.title, initialTitle);
  TestValidator.equals(
    "created description matches",
    before.description ?? null,
    initialDescription,
  );
  TestValidator.equals("created status matches", before.status, initialStatus);
  TestValidator.equals(
    "created severity matches",
    before.severity,
    initialSeverity,
  );
  TestValidator.equals(
    "created primary_subject_type matches",
    before.primary_subject_type ?? null,
    initialPrimarySubjectType,
  );
  TestValidator.equals(
    "created primary_subject_id matches",
    before.primary_subject_id ?? null,
    initialPrimarySubjectId,
  );
  TestValidator.equals(
    "created primary_subject_display matches",
    before.primary_subject_display ?? null,
    initialPrimarySubjectDisplay,
  );

  // 3. First partial update: change description and sla_due_at only
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();

  const firstUpdateBody = {
    description: newDescription,
    sla_due_at: futureDate,
  } satisfies IShoppingMallRiskCase.IUpdate;

  const afterFirst: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.update(connection, {
      riskCaseCode: before.case_code,
      body: firstUpdateBody,
    });
  typia.assert(afterFirst);

  // 4. Assertions for first update
  TestValidator.equals(
    "description updated in first patch",
    afterFirst.description ?? null,
    newDescription,
  );
  TestValidator.equals(
    "sla_due_at updated in first patch",
    afterFirst.sla_due_at ?? null,
    futureDate,
  );

  // Non-updated fields remain the same
  TestValidator.equals(
    "title unchanged after first patch",
    afterFirst.title,
    before.title,
  );
  TestValidator.equals(
    "status unchanged after first patch",
    afterFirst.status,
    before.status,
  );
  TestValidator.equals(
    "severity unchanged after first patch",
    afterFirst.severity,
    before.severity,
  );
  TestValidator.equals(
    "primary_subject_type unchanged after first patch",
    afterFirst.primary_subject_type ?? null,
    before.primary_subject_type ?? null,
  );
  TestValidator.equals(
    "primary_subject_id unchanged after first patch",
    afterFirst.primary_subject_id ?? null,
    before.primary_subject_id ?? null,
  );
  TestValidator.equals(
    "primary_subject_display unchanged after first patch",
    afterFirst.primary_subject_display ?? null,
    before.primary_subject_display ?? null,
  );
  TestValidator.equals(
    "closed_at unchanged after first patch",
    afterFirst.closed_at ?? null,
    before.closed_at ?? null,
  );
  TestValidator.equals(
    "deleted_at unchanged after first patch",
    afterFirst.deleted_at ?? null,
    before.deleted_at ?? null,
  );
  TestValidator.equals(
    "created_at unchanged after first patch",
    afterFirst.created_at,
    before.created_at,
  );

  // updated_at should advance
  TestValidator.predicate(
    "updated_at advanced after first patch",
    afterFirst.updated_at > before.updated_at,
  );

  // 5. Second partial update: clear nullable fields with null
  const secondUpdateBody = {
    description: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.IUpdate;

  const afterSecond: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.update(connection, {
      riskCaseCode: before.case_code,
      body: secondUpdateBody,
    });
  typia.assert(afterSecond);

  // 6. Assertions for second update - nullable fields cleared
  TestValidator.equals(
    "description cleared in second patch",
    afterSecond.description ?? null,
    null,
  );
  TestValidator.equals(
    "primary_subject_display cleared in second patch",
    afterSecond.primary_subject_display ?? null,
    null,
  );
  TestValidator.equals(
    "sla_due_at cleared in second patch",
    afterSecond.sla_due_at ?? null,
    null,
  );

  // Non-nullable / omitted fields remain unchanged
  TestValidator.equals(
    "title unchanged after second patch",
    afterSecond.title,
    before.title,
  );
  TestValidator.equals(
    "status unchanged after second patch",
    afterSecond.status,
    before.status,
  );
  TestValidator.equals(
    "severity unchanged after second patch",
    afterSecond.severity,
    before.severity,
  );

  // created_at remains original, updated_at advanced again
  TestValidator.equals(
    "created_at unchanged after second patch",
    afterSecond.created_at,
    before.created_at,
  );
  TestValidator.predicate(
    "updated_at advanced after second patch",
    afterSecond.updated_at > afterFirst.updated_at,
  );

  // Business rule: status remains active/open, no lifecycle transitions
  TestValidator.equals(
    "status remains open after all patches",
    afterSecond.status,
    initialStatus,
  );
}
