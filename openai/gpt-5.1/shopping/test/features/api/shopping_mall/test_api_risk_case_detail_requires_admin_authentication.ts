import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Ensure risk case detail endpoint requires admin authentication.
 *
 * Business purpose:
 *
 * - Guarantee that sensitive risk/fraud case details are only visible to
 *   authenticated admin actors.
 * - Prevent accidental exposure of investigation data to unauthenticated callers.
 *
 * Scenario:
 *
 * 1. Join a new admin via POST /auth/admin/join, which returns an
 *    IShoppingMallAdmin.IAuthorized payload and automatically attaches the
 *    Authorization header to the connection.
 * 2. Using this authenticated connection, create a concrete risk case via POST
 *    /shoppingMall/admin/riskCases with an IShoppingMallRiskCase.ICreate body.
 *    Capture the resulting IShoppingMallRiskCase including its case_code.
 * 3. Derive an unauthenticated connection by shallow-cloning the original
 *    connection and overriding its headers with an empty object. This ensures
 *    no Authorization header is sent, without manually mutating the existing
 *    connection.headers.
 * 4. With the unauthenticated connection, attempt to call GET
 *    /shoppingMall/admin/riskCases/{riskCaseCode} using the valid case_code
 *    from step 2. Wrap this call in TestValidator.error to assert that an error
 *    is thrown for unauthenticated access.
 *
 *    - Do NOT assert specific HTTP status codes like 401/403; only assert that some
 *         error is raised.
 * 5. As a positive control, perform the same GET call on the authenticated
 *    connection and verify success:
 *
 *    - Use typia.assert on the response type.
 *    - Use TestValidator.equals to compare core business fields between the created
 *         and retrieved risk cases (e.g., case_code, title, status, severity).
 */
export async function test_api_risk_case_detail_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Join an admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a concrete risk case using the authenticated admin connection
  const createBody = {
    case_code: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "open",
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    primary_subject_type:
      RandomGenerator.pick([
        "customer",
        "seller",
        "order",
        "payment",
        null,
      ] as const) ?? null,
    primary_subject_id: typia.random<(string & tags.Format<"uuid">) | null>(),
    primary_subject_display: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    sla_due_at: typia.random<(string & tags.Format<"date-time">) | null>(),
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: createBody,
    });
  typia.assert(createdCase);

  // Basic sanity check
  TestValidator.equals(
    "created risk case case_code matches request",
    createdCase.case_code,
    createBody.case_code,
  );

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to fetch risk case details without authentication
  await TestValidator.error(
    "unauthenticated risk case detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.at(
        unauthenticatedConnection,
        { riskCaseCode: createdCase.case_code },
      );
    },
  );

  // 5. Positive control: fetch risk case details with authenticated admin
  const fetchedCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.at(connection, {
      riskCaseCode: createdCase.case_code,
    });
  typia.assert(fetchedCase);

  // Business-level field comparisons
  TestValidator.equals(
    "fetched case_code matches created",
    fetchedCase.case_code,
    createdCase.case_code,
  );
  TestValidator.equals(
    "fetched title matches created",
    fetchedCase.title,
    createdCase.title,
  );
  TestValidator.equals(
    "fetched status matches created",
    fetchedCase.status,
    createdCase.status,
  );
  TestValidator.equals(
    "fetched severity matches created",
    fetchedCase.severity,
    createdCase.severity,
  );
}
