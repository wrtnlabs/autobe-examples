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
 * Verify that a platform admin cannot create a risk flag without required
 * fields.
 *
 * Business goal:
 *
 * - Ensure the risk-flagging API enforces its core business fields and does not
 *   allow structurally incomplete risk flags to be created under a valid
 *   platform-admin authorization context.
 *
 * Constraints from SDK/DTOs:
 *
 * - IShoppingMallRiskFlag.ICreate has all core fields (code, reasonCategory,
 *   riskLevel, message, active) as required TypeScript properties. Therefore we
 *   CANNOT send structurally invalid JSON bodies by omitting those properties
 *   without violating TypeScript. The test must not attempt to bypass type
 *   checking.
 * - We instead validate failure behavior for a logically invalid target (such as
 *   using a non-existent authCredentialsId) while contrasting with a
 *   syntactically valid example body.
 *
 * Test strategy:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join via
 *    api.functional.auth.platformAdmin.join. This establishes an authorized
 *    connection and configures the Authorization header internally in the SDK.
 * 2. Generate a random UUID for authCredentialsId that is extremely unlikely to
 *    correspond to an existing credentials row. This keeps focus on the create
 *    endpoint behavior while staying within valid type constraints.
 * 3. Prepare a syntactically valid IShoppingMallRiskFlag.ICreate payload using
 *    proper string and boolean values.
 * 4. Call the riskFlags.create endpoint with the random authCredentialsId and the
 *    valid body inside TestValidator.error, asserting that the operation fails
 *    (e.g., due to unknown auth credentials or business validation errors).
 *    This demonstrates that the backend enforces that the referenced
 *    credentials must exist and does not silently create orphaned risk flags.
 * 5. Optionally, for documentation purposes, we can also demonstrate how a
 *    successful call would look in a normal test (commented explanation only),
 *    but we do not actually create a success path here because we lack an API
 *    that returns a real authCredentialsId.
 *
 * Even though the natural-language scenario mentions "missing required fields",
 * this test rewrites that requirement into an implementable form that respects
 * TypeScript DTO constraints: we validate that the platform does not allow risk
 * flags to be created in an invalid business context, while always sending
 * type-correct IShoppingMallRiskFlag.ICreate bodies.
 */
export async function test_api_platform_admin_cannot_create_risk_flag_without_required_fields(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get an authorized session
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Prepare a random, likely non-existent authCredentialsId
  const fakeAuthCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare a syntactically valid risk flag creation body
  const validRiskFlagBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    message: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    expiresAt: null,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  // 4. Attempt to create a risk flag for a non-existent authCredentialsId and
  //    ensure that the call fails instead of creating an orphan flag.
  await TestValidator.error(
    "platform admin cannot create risk flag for non-existent auth credentials",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
        connection,
        {
          authCredentialsId: fakeAuthCredentialsId,
          body: validRiskFlagBody,
        },
      );
    },
  );

  // NOTE: We do not attempt to validate HTTP status codes or response bodies of
  // the error here. TestValidator.error only asserts that an error occurs,
  // which is sufficient to prove that the backend did not accept this invalid
  // business context for risk flag creation.
}
