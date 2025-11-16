import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that detailed auth credentials view exposes risk flags for a seller
 * credential.
 *
 * Business goal:
 *
 * - Ensure that when a platform admin attaches risk flags to a given auth
 *   credential, the credential detail endpoint returns those flags in its
 *   riskFlags projection, and that subsequent flag creations are reflected on
 *   re-read.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join.
 *
 *    - This establishes a privileged admin session on the shared connection.
 * 2. Pick an authCredentialsId to target.
 *
 *    - Because seller creation and credential search flows are out of scope for this
 *         test, we rely on a randomly generated UUID and assume test fixtures
 *         or the simulator provide a matching credential row when needed.
 * 3. As the platform admin, create a first active risk flag for that
 *    authCredentialsId using POST
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags
 *    with an IShoppingMallRiskFlag.ICreate payload.
 * 4. Call GET /shoppingMall/authCredentials/{authCredentialsId} to retrieve
 *    IShoppingMallAuthCredentials detail for that credential.
 *
 *    - Validate core credential fields (id, loginIdentifier email format, status
 *         string, isActive/isLocked/requiresPasswordReset booleans).
 *    - Validate that riskFlags is defined, non-empty, and that at least one flag’s
 *         shopping_mall_auth_credentials_id matches the authCredentialsId.
 * 5. Create a second risk flag for the same authCredentialsId.
 * 6. Call the GET endpoint again and validate that:
 *
 *    - RiskFlags is still an array.
 *    - The set of risk flag ids now contains both the original and the new flag ids.
 *    - Every element satisfies structural expectations of
 *         IShoppingMallRiskFlag.ISummary (UUID id, matching
 *         shopping_mall_auth_credentials_id, string risk_level and
 *         reason_category, boolean active, optional notes, created_at
 *         date-time, optional cleared_at date-time).
 */
export async function test_api_auth_credentials_detail_view_for_seller_with_risk_flags(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain a privileged session
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `https://admin.example.com/onboarding/${RandomGenerator.alphaNumeric(6)}`,
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Choose an authCredentialsId to work with (UUID). In a real E2E environment,
  //    fixtures would ensure that this id corresponds to an existing seller
  //    credentials record; here we rely on simulator/fixtures behaviour.
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create the first active risk flag for this credential as platform admin
  const firstFlagBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    expiresAt: null,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const firstFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: firstFlagBody,
      },
    );
  typia.assert(firstFlag);

  // 4. Retrieve the auth credentials detail and verify risk flags projection
  const firstDetail: IShoppingMallAuthCredentials =
    await api.functional.shoppingMall.authCredentials.at(connection, {
      authCredentialsId,
    });
  typia.assert(firstDetail);

  // Basic credential metadata checks
  TestValidator.predicate(
    "credential id must be a non-empty string",
    typeof firstDetail.id === "string" && firstDetail.id.length > 0,
  );
  TestValidator.predicate(
    "loginIdentifier must be a valid email-like string",
    typeof firstDetail.loginIdentifier === "string" &&
      firstDetail.loginIdentifier.includes("@"),
  );
  TestValidator.predicate(
    "status must be a non-empty string",
    typeof firstDetail.status === "string" && firstDetail.status.length > 0,
  );

  // Derived boolean flags must be booleans
  TestValidator.predicate(
    "isActive must be boolean",
    typeof firstDetail.isActive === "boolean",
  );
  TestValidator.predicate(
    "isLocked must be boolean",
    typeof firstDetail.isLocked === "boolean",
  );
  TestValidator.predicate(
    "requiresPasswordReset must be boolean",
    typeof firstDetail.requiresPasswordReset === "boolean",
  );

  // Risk flags should include at least the one we just created
  TestValidator.predicate(
    "riskFlags array should be defined and non-empty after creating first flag",
    Array.isArray(firstDetail.riskFlags) && firstDetail.riskFlags.length > 0,
  );

  const firstSummary = firstDetail.riskFlags![0];
  TestValidator.equals(
    "first risk flag summary should belong to target authCredentialsId",
    firstSummary.shopping_mall_auth_credentials_id,
    authCredentialsId,
  );

  // 5. Create a second risk flag for the same credential
  const secondFlagBody = {
    code: "multiple_failed_payments",
    reasonCategory: "chargeback_history",
    riskLevel: "medium",
    message: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    expiresAt: null,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const secondFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: secondFlagBody,
      },
    );
  typia.assert(secondFlag);

  // 6. Re-read the credentials detail and confirm riskFlags contains both
  const secondDetail: IShoppingMallAuthCredentials =
    await api.functional.shoppingMall.authCredentials.at(connection, {
      authCredentialsId,
    });
  typia.assert(secondDetail);

  TestValidator.predicate(
    "riskFlags array should be defined after creating second flag",
    Array.isArray(secondDetail.riskFlags) && secondDetail.riskFlags.length >= 2,
  );

  const flagIds: string[] = secondDetail.riskFlags!.map((rf) => rf.id);
  TestValidator.predicate(
    "riskFlags should contain id of first created flag",
    flagIds.includes(firstFlag.id),
  );
  TestValidator.predicate(
    "riskFlags should contain id of second created flag",
    flagIds.includes(secondFlag.id),
  );

  // Validate structural expectations for each summary element
  for (const summary of secondDetail.riskFlags!) {
    TestValidator.predicate(
      "summary.id must be non-empty string",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.equals(
      "summary.shopping_mall_auth_credentials_id must equal authCredentialsId",
      summary.shopping_mall_auth_credentials_id,
      authCredentialsId,
    );
    TestValidator.predicate(
      "summary.risk_level must be non-empty string",
      typeof summary.risk_level === "string" && summary.risk_level.length > 0,
    );
    TestValidator.predicate(
      "summary.reason_category must be non-empty string",
      typeof summary.reason_category === "string" &&
        summary.reason_category.length > 0,
    );
    TestValidator.predicate(
      "summary.active must be boolean",
      typeof summary.active === "boolean",
    );
    TestValidator.predicate(
      "summary.created_at must be non-empty string",
      typeof summary.created_at === "string" && summary.created_at.length > 0,
    );
  }
}
