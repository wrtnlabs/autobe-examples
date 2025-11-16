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
 * Validate idempotent and safe behavior of deleting missing or existing risk
 * flags under a platform-admin context.
 *
 * Business goal: Ensure that the platform-admin DELETE endpoint for risk flags
 * behaves safely when the target flag does not exist, does not corrupt any
 * state, and continues to behave correctly for subsequent legitimate create and
 * delete operations on real risk flags.
 *
 * Scenario steps:
 *
 * 1. Bootstrap a platform admin account via POST /auth/platformAdmin/join to
 *    obtain an authenticated admin session (SDK auto-injects token into
 *    connection headers).
 * 2. Choose an authCredentialsId scope value using a random UUID; we treat this as
 *    an arbitrary credentials record identifier so that we can focus this test
 *    on the erase/create flows themselves rather than full credentials
 *    lifecycle.
 * 3. Synthesize a riskFlagId that is almost certainly non-existent (another random
 *    UUID) and call DELETE
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags/{riskFlagId}
 *    via api.functional.shoppingMall.platformAdmin.authCredentials
 *    .riskFlags.erase. Use TestValidator.error to assert that this call results
 *    in an error, indicating that the missing resource is not silently treated
 *    as success without any signal. We do not assert any specific HTTP status
 *    code; we only assert that an error occurs.
 * 4. After that failure, create a real risk flag for the same authCredentialsId
 *    via api.functional.shoppingMall.platformAdmin.authCredentials
 *    .riskFlags.create, supplying a valid IShoppingMallRiskFlag.ICreate body
 *    with realistic values. Assert the returned IShoppingMallRiskFlag using
 *    typia.
 * 5. Call erase again, this time passing the real risk flag id. Assert that no
 *    error is thrown (simple await) so that a valid deletion is confirmed to
 *    work normally after the previous missing-delete.
 * 6. Finally, invoke erase once more with the same real risk flag id to exercise
 *    idempotency semantics on an already deleted record. We do not know whether
 *    the API chooses to treat this as a soft-success or a hard 404-like error,
 *    so we only call it without assertion or use TestValidator.error around it
 *    to check that some consistent behavior is exposed. In this draft we
 *    exercise the error branch using TestValidator.error to assert that a
 *    second delete yields an error. This can be adjusted if the real API is
 *    strictly idempotent-success on repeated deletes.
 */
export async function test_api_platform_admin_delete_risk_flag_idempotent_on_missing_record(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare an authCredentialsId scope using a random UUID
  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete a clearly non-existent risk flag
  const nonExistentRiskFlagId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent risk flag should yield an error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.erase(
        connection,
        {
          authCredentialsId,
          riskFlagId: nonExistentRiskFlagId,
        },
      );
    },
  );

  // 4. Create a real risk flag for the same authCredentialsId
  const createBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "medium",
    message: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    expiresAt: null,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const createdFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(createdFlag);

  // 5. Delete the real risk flag, expecting success without error
  await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.erase(
    connection,
    {
      authCredentialsId,
      riskFlagId: createdFlag.id,
    },
  );

  // 6. Attempt to delete the same flag again to exercise idempotency on
  //    already-deleted record. We assert that an error is thrown, which
  //    matches a strict 404-style behavior for missing records.
  await TestValidator.error(
    "deleting already-deleted risk flag should yield an error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.erase(
        connection,
        {
          authCredentialsId,
          riskFlagId: createdFlag.id,
        },
      );
    },
  );
}
