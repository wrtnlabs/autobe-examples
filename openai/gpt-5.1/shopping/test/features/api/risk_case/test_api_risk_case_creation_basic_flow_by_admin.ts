import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate basic creation flow of a ShoppingMall risk case by an authenticated
 * admin.
 *
 * Business goals:
 *
 * - Ensure that a newly joined admin can immediately create a high-level risk
 *   case using the minimal required fields.
 * - Verify that the system links the created risk case to the creating admin and
 *   does not silently alter key fields such as status and severity.
 * - Confirm that optional subject-linkage fields and SLA fields remain empty when
 *   omitted, modeling a systemic/non-subject-specific case.
 *
 * Flow:
 *
 * 1. Join an admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. Using the authenticated connection, call POST /shoppingMall/admin/riskCases
 *    with a minimal IShoppingMallRiskCase.ICreate payload.
 * 3. Verify that the response conforms to IShoppingMallRiskCase and that key
 *    fields match the request while system-managed fields are populated
 *    appropriately.
 */
export async function test_api_risk_case_creation_basic_flow_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare minimal risk case creation payload
  const requestedCaseCode = `RC-${RandomGenerator.alphaNumeric(12)}`;
  const requestedTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const requestedStatus = "open";
  const requestedSeverity = "high";

  const createBody = {
    case_code: requestedCaseCode,
    title: requestedTitle,
    status: requestedStatus,
    severity: requestedSeverity,
  } satisfies IShoppingMallRiskCase.ICreate;

  const created: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallRiskCase>(created);

  // 3. Field-level business validations
  // Basic echo of request fields
  TestValidator.equals(
    "risk case case_code should match request",
    created.case_code,
    requestedCaseCode,
  );
  TestValidator.equals(
    "risk case title should match request",
    created.title,
    requestedTitle,
  );
  TestValidator.equals(
    "risk case status should match request",
    created.status,
    requestedStatus,
  );
  TestValidator.equals(
    "risk case severity should match request",
    created.severity,
    requestedSeverity,
  );

  // Optional narrative & subject/SLA fields should remain empty when not provided
  TestValidator.predicate(
    "description should be null or undefined when omitted",
    created.description === null || created.description === undefined,
  );
  TestValidator.predicate(
    "primary_subject_type should be null or undefined when omitted",
    created.primary_subject_type === null ||
      created.primary_subject_type === undefined,
  );
  TestValidator.predicate(
    "primary_subject_id should be null or undefined when omitted",
    created.primary_subject_id === null ||
      created.primary_subject_id === undefined,
  );
  TestValidator.predicate(
    "primary_subject_display should be null or undefined when omitted",
    created.primary_subject_display === null ||
      created.primary_subject_display === undefined,
  );
  TestValidator.predicate(
    "sla_due_at should be null or undefined when omitted",
    created.sla_due_at === null || created.sla_due_at === undefined,
  );
  TestValidator.predicate(
    "closed_at should be null or undefined immediately after creation",
    created.closed_at === null || created.closed_at === undefined,
  );

  // System-managed timestamps: created_at and updated_at must be populated
  TestValidator.predicate(
    "created_at must be a non-empty string",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );

  // Soft-delete flag should not be set for a fresh case
  TestValidator.predicate(
    "deleted_at should be null or undefined for a fresh risk case",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // Admin linkages
  // created_by_admin must be present and correspond to the joined admin
  TestValidator.predicate(
    "created_by_admin must be present",
    created.created_by_admin !== null && created.created_by_admin !== undefined,
  );

  // Compare by id (authoritative) and email for additional confidence
  TestValidator.equals(
    "created_by_admin.id should match authorized admin id",
    created.created_by_admin.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "created_by_admin.email should match authorized admin email",
    created.created_by_admin.email,
    authorizedAdmin.email,
  );

  // New case should have no owner or closer assigned
  TestValidator.predicate(
    "owner_admin should be null or undefined on creation",
    created.owner_admin === null || created.owner_admin === undefined,
  );
  TestValidator.predicate(
    "closed_by_admin should be null or undefined on creation",
    created.closed_by_admin === null || created.closed_by_admin === undefined,
  );
}
