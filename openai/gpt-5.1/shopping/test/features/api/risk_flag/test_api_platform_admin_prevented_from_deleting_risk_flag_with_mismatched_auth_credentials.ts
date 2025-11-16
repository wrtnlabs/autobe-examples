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
 * Validate that platform admin cannot delete a risk flag using a mismatched
 * authCredentialsId.
 *
 * Business goal: Ensure that DELETE
 * /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags/{riskFlagId}
 * enforces that the risk flag being deleted actually belongs to the provided
 * authCredentialsId, and that cross-scope deletion attempts fail without
 * affecting the true owner’s flags.
 *
 * Scenario steps (implemented with available SDK only):
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest for the join body.
 *    - Capture the resulting IShoppingMallPlatformAdmin.IAuthorized, which includes
 *         the admin identity and JWT token that the SDK will install into
 *         connection.headers automatically.
 *    - From the join result we do not have an explicit authCredentialsId, so we will
 *         treat that id as opaque and instead generate a separate UUID for the
 *         mismatched credentials id used only as a path parameter.
 * 2. Create a risk flag attached to a concrete auth credentials id A.
 *
 *    - Since there is no endpoint to create credentials directly, we must treat the
 *         authCredentialsId path parameter as an abstract UUID that the backend
 *         understands. For a positive path we generate authCredentialsId_A as a
 *         random UUID using typia.random<string & tags.Format<"uuid">>().
 *    - Call POST
 *         /shoppingMall/platformAdmin/authCredentials/{authCredentialsId_A}/riskFlags
 *         via
 *         api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create
 *         using IShoppingMallRiskFlag.ICreate for the body.
 *    - Capture the returned IShoppingMallRiskFlag as riskFlag_A and assert it with
 *         typia.assert.
 * 3. Prepare a second, distinct auth credentials id B.
 *
 *    - Generate authCredentialsId_B as another random UUID, and assert it is
 *         different from authCredentialsId_A using TestValidator.notEquals.
 * 4. Attempt a mismatched delete.
 *
 *    - While still authenticated as the same platform admin, invoke DELETE
 *         /shoppingMall/platformAdmin/authCredentials/{authCredentialsId_B}/riskFlags/{riskFlag_A.id}
 *         via
 *         api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.erase.
 *    - This call must be wrapped in TestValidator.error with an async callback so
 *         that we assert a runtime error occurs (the service should respond
 *         with a 4xx according to its docs). We do not check exact HTTP status;
 *         we only validate that the operation fails.
 * 5. Confirm that the risk flag still exists under credentials A.
 *
 *    - Call GET /shoppingMall/platformAdmin/authCredentials/{authCredentialsId_A}/riskFlags/{riskFlag_A.id}
 *         via
 *         api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at.
 *    - Assert the response with typia.assert and verify that the id matches
 *         riskFlag_A.id using TestValidator.equals.
 * 6. Delete with the correct credentials id and verify removal.
 *
 *    - Call erase again but this time with authCredentialsId_A and riskFlag_A.id and
 *         expect it to succeed (no error wrapper).
 *    - Afterwards, call at() again for the same pair inside TestValidator.error to
 *         assert that fetching the deleted flag now fails.
 *
 * Constraints and rules:
 *
 * - All SDK calls must be awaited.
 * - Only the provided SDK functions are used: join, create, at, erase.
 * - Request bodies must use `satisfies` with the exact DTO
 *   (IShoppingMallPlatformAdminJoin.IRequest, IShoppingMallRiskFlag.ICreate).
 * - No deliberate type errors, `as any`, or missing required fields.
 * - No direct manipulation of connection.headers.
 */
export async function test_api_platform_admin_prevented_from_deleting_risk_flag_with_mismatched_auth_credentials(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a risk flag under a concrete auth credentials id A
  const authCredentialsId_A: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const riskCreateBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    expiresAt: null,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const riskFlag_A: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId: authCredentialsId_A,
        body: riskCreateBody,
      },
    );
  typia.assert(riskFlag_A);

  TestValidator.equals(
    "created risk flag authCredentialsId matches path parameter",
    riskFlag_A.authCredentialsId,
    authCredentialsId_A,
  );

  // 3. Prepare a second, distinct auth credentials id B
  const authCredentialsId_B: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  TestValidator.notEquals(
    "authCredentialsId_B must differ from authCredentialsId_A",
    authCredentialsId_B,
    authCredentialsId_A,
  );

  // 4. Attempt a mismatched delete: credentials B tries to delete flag owned by A
  await TestValidator.error(
    "mismatched credentials delete must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.erase(
        connection,
        {
          authCredentialsId: authCredentialsId_B,
          riskFlagId: riskFlag_A.id,
        },
      );
    },
  );

  // 5. Confirm the risk flag still exists under credentials A
  const stillThere: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId: authCredentialsId_A,
        riskFlagId: riskFlag_A.id,
      },
    );
  typia.assert(stillThere);

  TestValidator.equals(
    "risk flag still retrievable after mismatched delete",
    stillThere.id,
    riskFlag_A.id,
  );

  // 6. Delete with correct credentials id and verify it is gone
  await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.erase(
    connection,
    {
      authCredentialsId: authCredentialsId_A,
      riskFlagId: riskFlag_A.id,
    },
  );

  await TestValidator.error(
    "fetching deleted risk flag must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
        connection,
        {
          authCredentialsId: authCredentialsId_A,
          riskFlagId: riskFlag_A.id,
        },
      );
    },
  );
}
