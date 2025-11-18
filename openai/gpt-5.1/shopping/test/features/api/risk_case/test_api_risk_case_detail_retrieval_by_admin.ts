import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate that an authenticated admin can create and then retrieve a full risk
 * case detail snapshot by its business case_code.
 *
 * Business flow:
 *
 * 1. Admin joins via POST /auth/admin/join and obtains an authorized context. The
 *    SDK automatically stores the admin access token into connection headers,
 *    so subsequent calls are authenticated as this admin.
 * 2. Using the authenticated admin connection, create a new risk case via POST
 *    /shoppingMall/admin/riskCases with a well-formed
 *    IShoppingMallRiskCase.ICreate payload.
 * 3. Retrieve the risk case detail via GET
 *    /shoppingMall/admin/riskCases/{riskCaseCode} using the same case_code used
 *    at creation time.
 * 4. Assert that the retrieved IShoppingMallRiskCase passes typia.assert and that
 *    key business fields match the creation response, including:
 *
 *    - Case_code, title, status, severity
 *    - Primary_subject_type, primary_subject_id, primary_subject_display
 *    - Sla_due_at
 *    - Created_at, updated_at, deleted_at
 *    - Created_by_admin, owner_admin, closed_by_admin
 * 5. Specifically verify that created_by_admin corresponds to the admin returned
 *    by the join endpoint, and that owner_admin and closed_by_admin reflect the
 *    initial state of a newly created case (typically null).
 */
export async function test_api_risk_case_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure created_by_admin in later entities should correspond to this admin
  const createdAdminSummary: IShoppingMallAdmin.ISummary | undefined =
    adminAuthorized.admin;

  // 2. Create a new risk case as this admin
  const now = new Date();
  const slaDueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const riskCaseCreateBody = {
    case_code: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    primary_subject_type: RandomGenerator.pick([
      "customer",
      "seller",
      "order",
      "payment",
      null,
    ] as const),
    primary_subject_id: typia.random<
      (string & tags.Format<"uuid">) | null | undefined
    >(),
    primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
    sla_due_at: slaDueAt,
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdRiskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert(createdRiskCase);

  // 3. Retrieve the risk case by its business case_code
  const retrievedRiskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.at(connection, {
      riskCaseCode: createdRiskCase.case_code,
    });
  typia.assert(retrievedRiskCase);

  // 4. Basic field equality checks between created and retrieved
  TestValidator.equals(
    "risk case code should match between create and retrieve",
    retrievedRiskCase.case_code,
    createdRiskCase.case_code,
  );
  TestValidator.equals(
    "risk case title should match between create and retrieve",
    retrievedRiskCase.title,
    createdRiskCase.title,
  );
  TestValidator.equals(
    "risk case status should match between create and retrieve",
    retrievedRiskCase.status,
    createdRiskCase.status,
  );
  TestValidator.equals(
    "risk case severity should match between create and retrieve",
    retrievedRiskCase.severity,
    createdRiskCase.severity,
  );

  TestValidator.equals(
    "primary_subject_type should match between create and retrieve",
    retrievedRiskCase.primary_subject_type ?? null,
    createdRiskCase.primary_subject_type ?? null,
  );
  TestValidator.equals(
    "primary_subject_id should match between create and retrieve",
    retrievedRiskCase.primary_subject_id ?? null,
    createdRiskCase.primary_subject_id ?? null,
  );
  TestValidator.equals(
    "primary_subject_display should match between create and retrieve",
    retrievedRiskCase.primary_subject_display ?? null,
    createdRiskCase.primary_subject_display ?? null,
  );

  TestValidator.equals(
    "sla_due_at should match between create and retrieve",
    retrievedRiskCase.sla_due_at ?? null,
    createdRiskCase.sla_due_at ?? null,
  );

  // created_at should be equal; updated_at may be equal at creation time
  TestValidator.equals(
    "created_at should match between create and retrieve",
    retrievedRiskCase.created_at,
    createdRiskCase.created_at,
  );
  TestValidator.equals(
    "updated_at should match between create and retrieve",
    retrievedRiskCase.updated_at,
    createdRiskCase.updated_at,
  );
  TestValidator.equals(
    "deleted_at should match between create and retrieve",
    retrievedRiskCase.deleted_at ?? null,
    createdRiskCase.deleted_at ?? null,
  );

  // 5. Admin association checks
  // created_by_admin must be populated and should correspond to the joined admin
  TestValidator.predicate(
    "created_by_admin must be present on created risk case",
    retrievedRiskCase.created_by_admin !== null &&
      retrievedRiskCase.created_by_admin !== undefined,
  );

  if (createdAdminSummary !== undefined) {
    TestValidator.equals(
      "created_by_admin.id should match joined admin id when summary present",
      retrievedRiskCase.created_by_admin.id,
      createdAdminSummary.id,
    );
    TestValidator.equals(
      "created_by_admin.email should match joined admin email when summary present",
      retrievedRiskCase.created_by_admin.email,
      createdAdminSummary.email,
    );
  } else {
    TestValidator.equals(
      "created_by_admin.id should match top-level authorized admin id when summary missing",
      retrievedRiskCase.created_by_admin.id,
      adminAuthorized.id,
    );
    TestValidator.equals(
      "created_by_admin.email should match top-level authorized admin email when summary missing",
      retrievedRiskCase.created_by_admin.email,
      adminAuthorized.email,
    );
  }

  // owner_admin and closed_by_admin should reflect initial state - typically null
  await TestValidator.predicate(
    "initial owner_admin should be null or undefined",
    async () => retrievedRiskCase.owner_admin == null,
  );
  await TestValidator.predicate(
    "initial closed_by_admin should be null or undefined",
    async () => retrievedRiskCase.closed_by_admin == null,
  );
}
