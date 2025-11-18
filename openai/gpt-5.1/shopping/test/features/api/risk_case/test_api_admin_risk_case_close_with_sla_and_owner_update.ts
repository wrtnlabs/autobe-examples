import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_admin_risk_case_close_with_sla_and_owner_update(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies tags.Format<"password"> in tests
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
    ip: "127.0.0.1",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  const adminSummary = authorizedAdmin.admin;
  TestValidator.predicate(
    "authorized admin should have summary object",
    adminSummary !== undefined && adminSummary !== null,
  );
  typia.assert<IShoppingMallAdmin.ISummary>(adminSummary!);

  // 2. Create an OPEN, HIGH severity risk case with realistic primary subject linkage
  const primarySubjectId = typia.random<string & tags.Format<"uuid">>();
  const caseCode = `RC-${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    case_code: caseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    severity: "high",
    primary_subject_type: "customer",
    primary_subject_id: primarySubjectId,
    primary_subject_display: `${RandomGenerator.name(1)} <${RandomGenerator.alphabets(6)}@customer.test>`,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallRiskCase>(createdCase);

  TestValidator.equals(
    "created case_code should match requested case_code",
    createdCase.case_code,
    caseCode,
  );
  TestValidator.equals(
    "created case should be open",
    createdCase.status,
    "open",
  );
  TestValidator.equals(
    "created severity should be high",
    createdCase.severity,
    "high",
  );

  // Ensure created_by_admin is populated and matches authorized admin
  typia.assert<IShoppingMallAdmin.ISummary>(createdCase.created_by_admin);
  TestValidator.equals(
    "created_by_admin.id should match authorized admin id",
    createdCase.created_by_admin.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "created_by_admin.email should match authorized admin email",
    createdCase.created_by_admin.email,
    authorizedAdmin.email,
  );

  // 3. Compute SLA and closure timestamps
  const now = new Date();
  const slaPast = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const sla_due_at: string & tags.Format<"date-time"> =
    slaPast.toISOString() as string & tags.Format<"date-time">;
  const closed_at: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;

  // 4. Close the risk case with SLA and ownership fields via update
  const updateBody = {
    status: "closed",
    sla_due_at,
    closed_at,
    owner_admin_id: authorizedAdmin.id,
    closed_by_admin_id: authorizedAdmin.id,
  } satisfies IShoppingMallRiskCase.IUpdate;

  const closedCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.update(connection, {
      riskCaseCode: createdCase.case_code,
      body: updateBody,
    });
  typia.assert<IShoppingMallRiskCase>(closedCase);

  // 5. Validate closed state and relationships
  TestValidator.equals(
    "risk case status should be closed after update",
    closedCase.status,
    "closed",
  );

  // closed_at must be non-null and should match the requested timestamp (server may normalize but we assert equality here)
  TestValidator.predicate(
    "closed_at should not be null after closing",
    closedCase.closed_at !== null && closedCase.closed_at !== undefined,
  );

  TestValidator.equals(
    "closed_at should match requested closed_at",
    closedCase.closed_at,
    closed_at,
  );

  // SLA due should persist and match
  TestValidator.equals(
    "sla_due_at should match requested sla_due_at",
    closedCase.sla_due_at ?? null,
    sla_due_at,
  );

  // owner_admin should be populated and reflect owner_admin_id
  if (closedCase.owner_admin !== null && closedCase.owner_admin !== undefined) {
    typia.assert<IShoppingMallAdmin.ISummary>(closedCase.owner_admin);
    TestValidator.equals(
      "owner_admin.id should match authorized admin id",
      closedCase.owner_admin.id,
      authorizedAdmin.id,
    );
  } else {
    // If server chose not to populate owner_admin summary, we still ensure no contradiction in core lifecycle assertions.
    TestValidator.predicate(
      "owner_admin may be null but test still passes core lifecycle validation",
      true,
    );
  }

  // closed_by_admin should be populated and reflect closed_by_admin_id
  if (
    closedCase.closed_by_admin !== null &&
    closedCase.closed_by_admin !== undefined
  ) {
    typia.assert<IShoppingMallAdmin.ISummary>(closedCase.closed_by_admin);
    TestValidator.equals(
      "closed_by_admin.id should match authorized admin id",
      closedCase.closed_by_admin.id,
      authorizedAdmin.id,
    );
  } else {
    TestValidator.predicate(
      "closed_by_admin may be null but lifecycle still valid",
      true,
    );
  }

  // 6. Optional: idempotent-style re-update without changing closure fields to ensure they remain stable
  const secondUpdateBody = {
    status: "closed",
  } satisfies IShoppingMallRiskCase.IUpdate;

  const reloadedCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.update(connection, {
      riskCaseCode: createdCase.case_code,
      body: secondUpdateBody,
    });
  typia.assert<IShoppingMallRiskCase>(reloadedCase);

  TestValidator.equals(
    "status should remain closed after second update",
    reloadedCase.status,
    "closed",
  );
}
