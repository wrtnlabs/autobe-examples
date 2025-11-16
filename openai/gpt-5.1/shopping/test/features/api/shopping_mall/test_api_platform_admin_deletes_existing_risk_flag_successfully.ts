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
 * Validate platform admin-driven deletion of an existing risk flag.
 *
 * Business goal: Ensure that a platform administrator, once authenticated, can
 * delete a specific risk flag associated with a given authentication
 * credentials record, and that the deleted flag is no longer readable
 * afterward.
 *
 * High-level steps:
 *
 * 1. Bootstrap a platform administrator via the join endpoint to establish an
 *    authenticated admin session in the SDK connection.
 * 2. Create a new risk flag for some authCredentialsId using the
 *    platformAdmin-scoped riskFlags.create endpoint.
 * 3. Retrieve the newly created flag via riskFlags.at to confirm it exists and
 *    that the returned identifiers are consistent.
 * 4. Delete the flag with riskFlags.erase using the same authCredentialsId and
 *    riskFlagId.
 * 5. Attempt to retrieve the flag again and assert that an error is thrown,
 *    representing a not-found or equivalent failure.
 */
export async function test_api_platform_admin_deletes_existing_risk_flag_successfully(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator so that subsequent calls run
  //    with platformAdmin authorization handled by the SDK.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(), // just a random-looking string
    href: "https://admin.example.com/join", // valid URI-like string
    referrer: "https://admin.example.com/landing", // valid URI-like string
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a risk flag under some authCredentialsId. Since we don't have
  //    an API to create credentials, we rely on the DTO contract and
  //    existing test scaffolding style, but we must use the IDs coming
  //    back from the API afterward.
  const seedAuthCredentialsId = typia.random<string & tags.Format<"uuid">>();

  const createBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    // Optionals: exercise nullable + undefined shapes a bit
    expiresAt: null,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const createdFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId: seedAuthCredentialsId,
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(createdFlag);

  const authCredentialsId: string & tags.Format<"uuid"> =
    createdFlag.authCredentialsId;
  const riskFlagId: string & tags.Format<"uuid"> = createdFlag.id;

  // 3. Confirm the flag can be read before deletion.
  const fetchedBeforeDelete =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId,
        riskFlagId,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched risk flag id should match created id before deletion",
    fetchedBeforeDelete.id,
    createdFlag.id,
  );
  TestValidator.equals(
    "fetched authCredentialsId should match created authCredentialsId before deletion",
    fetchedBeforeDelete.authCredentialsId,
    createdFlag.authCredentialsId,
  );

  // 4. Delete the risk flag.
  await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.erase(
    connection,
    {
      authCredentialsId,
      riskFlagId,
    },
  );

  // 5. After deletion, we expect that attempting to fetch the same flag will
  //    fail with some HTTP error (404/400/403, etc.). We only assert that an
  //    error is thrown, not the specific status code.
  await TestValidator.error(
    "deleted risk flag should not be retrievable",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
        connection,
        {
          authCredentialsId,
          riskFlagId,
        },
      );
    },
  );
}
