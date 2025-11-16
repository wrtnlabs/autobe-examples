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
 * Ensure that unauthorized actors (without platform admin Authorization) cannot
 * create risk flags.
 *
 * Business intent:
 *
 * - Risk flag creation on authentication credentials is a privileged operation
 *   restricted to platform administrators.
 * - Calls made without a valid platformAdmin session must be rejected even when
 *   the payload is syntactically valid.
 *
 * Test workflow:
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join to
 *    honor the declared dependency.
 *
 *    - This also populates the shared connection with a valid Authorization header
 *         as a side effect, but we will not use this authenticated connection
 *         for the main scenario.
 * 2. Construct a separate unauthenticated connection object that does not carry
 *    Authorization headers.
 * 3. Prepare a syntactically valid IShoppingMallRiskFlag.ICreate request body.
 * 4. Generate a random authCredentialsId (UUID) for the path parameter.
 * 5. Call POST
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags
 *    via the unauthenticated connection and assert that the operation fails
 *    with an HTTP error.
 *
 * Validations:
 *
 * - The admin join response matches IShoppingMallPlatformAdmin.IAuthorized via
 *   typia.assert.
 * - The unauthorized risk flag creation attempt throws, validated by
 *   TestValidator.error.
 */
export async function test_api_unauthorized_actor_cannot_create_risk_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to satisfy the dependency requirement.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an unauthenticated connection that does not carry Authorization header.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare a syntactically valid risk flag creation payload.
  const riskFlagBody = {
    code: "multiple_failed_payments",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  // 4. Generate a random credentials ID for the path parameter.
  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  // 5. Attempt to create a risk flag without valid platformAdmin Authorization and
  //    verify that the API rejects the call.
  await TestValidator.error(
    "unauthenticated connection cannot create risk flag",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
        unauthenticatedConnection,
        {
          authCredentialsId,
          body: riskFlagBody,
        },
      );
    },
  );
}
