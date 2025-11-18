import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_risk_case_creation_with_primary_subject_linkage(
  connection: api.IConnection,
) {
  /**
   * Validate that an authenticated admin can create a risk case with
   * primary-subject linkage and an optional SLA due date, and that the linkage
   * fields are echoed back correctly in the creation response.
   *
   * Business flow:
   *
   * 1. Admin joins via POST /auth/admin/join to establish an authenticated context
   *    (Authorization header handled by SDK).
   * 2. Using the authenticated admin connection, call POST
   *    /shoppingMall/admin/riskCases with an IShoppingMallRiskCase.ICreate
   *    payload that includes:
   *
   *    - Unique case_code and descriptive title.
   *    - Valid status and severity strings.
   *    - Primary_subject_type set to a supported logical actor/entity label (e.g.,
   *         "customer").
   *    - Primary_subject_id as a syntactically valid UUID.
   *    - Primary_subject_display as a human-readable identifier (e.g., an email-like
   *         string).
   *    - Sla_due_at set to an ISO date-time in the near future.
   * 3. Assert that the response conforms to IShoppingMallRiskCase and that the
   *    primary_subject_type, primary_subject_id and primary_subject_display
   *    fields match the submitted values.
   * 4. Check that sla_due_at is preserved or only trivially normalized by
   *    comparing the sent and received values.
   */

  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    // For testing, generate reasonable URI-like values for href/referrer.
    href: "https://admin.test.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin.test.shoppingmall.local/landing" as string &
      tags.Format<"uri">,
    // Optional ip left undefined to let backend derive it.
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare risk case creation payload with primary subject linkage
  const primarySubjectId = typia.random<string & tags.Format<"uuid">>();
  const slaDueAt = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 1 hour in future

  const createBody = {
    case_code: `RC-${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "open",
    severity: "high",
    primary_subject_type: "customer",
    primary_subject_id: primarySubjectId,
    primary_subject_display: typia.random<string & tags.Format<"email">>(),
    sla_due_at: slaDueAt,
  } satisfies IShoppingMallRiskCase.ICreate;

  const created: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Validate primary subject linkage fields round-trip
  TestValidator.equals(
    "primary subject type round-trips correctly",
    created.primary_subject_type,
    createBody.primary_subject_type,
  );

  TestValidator.equals(
    "primary subject id round-trips correctly",
    created.primary_subject_id,
    createBody.primary_subject_id,
  );

  TestValidator.equals(
    "primary subject display round-trips correctly",
    created.primary_subject_display,
    createBody.primary_subject_display,
  );

  // 4. Validate SLA due date round-trip (allowing for possible
  // normalization; here we expect equality because we send a full
  // ISO string with timezone.)
  TestValidator.equals(
    "SLA due date is stored consistently",
    created.sla_due_at,
    createBody.sla_due_at,
  );

  // Also ensure that core lifecycle fields are set meaningfully.
  TestValidator.predicate(
    "risk case has a non-empty business case_code",
    !!created.case_code && created.case_code.length > 0,
  );

  TestValidator.predicate(
    "risk case status is non-empty",
    !!created.status && created.status.length > 0,
  );

  TestValidator.predicate(
    "risk case severity is non-empty",
    !!created.severity && created.severity.length > 0,
  );

  // Confirm created_by_admin refers to the same admin id that just joined.
  TestValidator.equals(
    "created_by_admin id matches joined admin id",
    created.created_by_admin.id,
    adminAuthorized.id,
  );
}
