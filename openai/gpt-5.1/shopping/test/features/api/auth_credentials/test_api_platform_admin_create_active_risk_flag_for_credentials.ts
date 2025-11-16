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
 * Validate that a platform administrator can create an active risk flag for a
 * specific authentication credential.
 *
 * Business goal: ensure privileged platformAdmin actor can attach a risk/fraud
 * flag (IShoppingMallRiskFlag) to a given auth credentials record via POST
 * /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags and
 * get back the full created record with correct linkage and fields.
 *
 * Workflow:
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join
 *    with a realistic IShoppingMallPlatformAdminJoin.IRequest body. This
 *    returns IShoppingMallPlatformAdmin.IAuthorized and automatically
 *    configures Authorization headers on the connection via the SDK.
 * 2. Prepare a target authCredentialsId. As no credentials listing or lookup API
 *    is provided in this test scope, use a randomly generated UUID that
 *    satisfies the tags.Format<"uuid"> constraint.
 * 3. Build a request body satisfying IShoppingMallRiskFlag.ICreate with realistic
 *    values:
 *
 *    - Code: a machine-readable string, e.g. "multiple_failed_payments"
 *    - ReasonCategory: e.g. "suspected_fraud"
 *    - RiskLevel: e.g. "high"
 *    - Message: descriptive RandomGenerator.paragraph() text
 *    - Active: true
 *    - ExpiresAt: optional ISO timestamp in the near future
 *    - Notes: optional internal note string
 * 4. Call
 *    api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create
 *    with the generated authCredentialsId and body.
 * 5. Validate the response:
 *
 *    - Typia.assert to ensure it matches IShoppingMallRiskFlag
 *    - Id is a UUID and not empty (trusted via typia, so no extra format checks)
 *    - AuthCredentialsId equals the path parameter used in the request
 *    - Business fields (code, reasonCategory, riskLevel, message, active, expiresAt,
 *         notes) match the request body via TestValidator.equals
 *    - CreatedAt and updatedAt are present (typia.assert covers type) and we can at
 *         least assert they are non-empty strings
 *
 * Error handling / constraints:
 *
 * - Do not attempt to test type or validation errors; focus on successful
 *   creation only.
 * - Do not manipulate connection.headers manually; rely on join() to set
 *   Authorization.
 */
export async function test_api_platform_admin_create_active_risk_flag_for_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a random authCredentialsId
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build risk flag create body
  const riskFlagBody = {
    code: "multiple_failed_payments",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 8 }),
    active: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  // 4. Create risk flag for the target credentials
  const riskFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: riskFlagBody,
      },
    );

  // 5. Validate response structure and business fields
  typia.assert(riskFlag);

  // authCredentialsId must match path param
  TestValidator.equals(
    "risk flag authCredentialsId matches path parameter",
    riskFlag.authCredentialsId,
    authCredentialsId,
  );

  // Business fields echo request body
  TestValidator.equals(
    "risk flag code echoes request body",
    riskFlag.code,
    riskFlagBody.code,
  );
  TestValidator.equals(
    "risk flag reasonCategory echoes request body",
    riskFlag.reasonCategory,
    riskFlagBody.reasonCategory,
  );
  TestValidator.equals(
    "risk flag riskLevel echoes request body",
    riskFlag.riskLevel,
    riskFlagBody.riskLevel,
  );
  TestValidator.equals(
    "risk flag message echoes request body",
    riskFlag.message,
    riskFlagBody.message,
  );
  TestValidator.equals(
    "risk flag active echoes request body",
    riskFlag.active,
    riskFlagBody.active,
  );
  TestValidator.equals(
    "risk flag expiresAt echoes request body",
    riskFlag.expiresAt,
    riskFlagBody.expiresAt,
  );
  TestValidator.equals(
    "risk flag notes echoes request body",
    riskFlag.notes,
    riskFlagBody.notes,
  );

  // Ensure timestamps are non-empty strings (typia already ensures type)
  TestValidator.predicate(
    "risk flag createdAt is non-empty",
    riskFlag.createdAt.length > 0,
  );
  TestValidator.predicate(
    "risk flag updatedAt is non-empty",
    riskFlag.updatedAt.length > 0,
  );
}
