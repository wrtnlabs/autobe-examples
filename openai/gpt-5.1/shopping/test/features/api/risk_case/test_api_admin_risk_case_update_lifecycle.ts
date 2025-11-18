import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_admin_risk_case_update_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated connection context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // matches password format tag
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: "127.0.0.1",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial risk case with status OPEN and severity MEDIUM
  const initialRiskCaseBody = {
    case_code: `CASE-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: "medium",
    primary_subject_type: "seller",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: RandomGenerator.name(2),
    sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallRiskCase.ICreate;

  const created: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: initialRiskCaseBody,
    });
  typia.assert<IShoppingMallRiskCase>(created);

  // snapshot immutable and audit fields
  const originalId = created.id;
  const originalCaseCode = created.case_code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalCreatedByAdmin = created.created_by_admin;
  const originalOwnerAdmin = created.owner_admin ?? null;
  const originalClosedByAdmin = created.closed_by_admin ?? null;

  // 3. Update the risk case: status open -> under_review, severity medium -> high
  const updatedTitle = `${created.title} - updated`;
  const updatedDescription = `${created.description ?? ""} | investigation details updated`;
  const updatedDisplay = `${created.primary_subject_display ?? "subject"} (refined)`;

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    status: "under_review",
    severity: "high",
    primary_subject_display: updatedDisplay,
  } satisfies IShoppingMallRiskCase.IUpdate;

  const updated: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.update(connection, {
      riskCaseCode: originalCaseCode,
      body: updateBody,
    });
  typia.assert<IShoppingMallRiskCase>(updated);

  // 4. Assertions on identifiers and core invariants
  TestValidator.equals(
    "risk case id is stable after update",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "risk case case_code is stable after update",
    updated.case_code,
    originalCaseCode,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  // created_by_admin should remain the same summary
  TestValidator.equals(
    "created_by_admin summary remains unchanged",
    updated.created_by_admin,
    originalCreatedByAdmin,
  );

  // owner_admin and closed_by_admin should remain unchanged (or consistently null)
  TestValidator.equals(
    "owner_admin remains unchanged (or stays null)",
    updated.owner_admin ?? null,
    originalOwnerAdmin,
  );
  TestValidator.equals(
    "closed_by_admin remains unchanged (or stays null)",
    updated.closed_by_admin ?? null,
    originalClosedByAdmin,
  );

  // 5. Assertions on applied updates
  TestValidator.equals("title has been updated", updated.title, updatedTitle);
  TestValidator.equals(
    "description has been updated",
    updated.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "severity has been escalated to high",
    updated.severity,
    "high",
  );
  TestValidator.equals(
    "status moved to under_review",
    updated.status,
    "under_review",
  );
  TestValidator.equals(
    "primary_subject_display reflects refined subject",
    updated.primary_subject_display ?? null,
    updatedDisplay,
  );

  // closed_at must remain null/undefined for non-terminal status
  TestValidator.predicate(
    "closed_at remains unset for under_review status",
    () => updated.closed_at === null || updated.closed_at === undefined,
  );

  // updated_at should not be earlier than original updated_at
  TestValidator.predicate("updated_at is equal or later than original", () => {
    const prev = new Date(originalUpdatedAt).getTime();
    const next = new Date(updated.updated_at).getTime();
    return next >= prev;
  });
}
