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

export async function test_api_platform_admin_get_risk_flag_not_found_for_wrong_credential(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain authorized session
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare two different authCredentialsId values: A (owner) and B (wrong)
  const authCredentialsIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const authCredentialsIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure A and B are different (best-effort; if equal, regenerate B once)
  let effectiveAuthCredentialsIdB: string & tags.Format<"uuid"> =
    authCredentialsIdB;
  if (effectiveAuthCredentialsIdB === authCredentialsIdA) {
    effectiveAuthCredentialsIdB = typia.random<string & tags.Format<"uuid">>();
  }

  // 3. Create a risk flag under credential A
  const createBody = typia.random<IShoppingMallRiskFlag.ICreate>();
  const createdFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId: authCredentialsIdA,
        body: createBody,
      },
    );
  typia.assert(createdFlag);

  // 4. Attempt to retrieve the risk flag with a different authCredentialsId (B)
  await TestValidator.error(
    "risk flag lookup with wrong authCredentialsId must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
        connection,
        {
          authCredentialsId: effectiveAuthCredentialsIdB,
          riskFlagId: createdFlag.id,
        },
      );
    },
  );

  // 5. Sanity check: retrieving with the correct authCredentialsId (A) should succeed
  const fetchedFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId: authCredentialsIdA,
        riskFlagId: createdFlag.id,
      },
    );
  typia.assert(fetchedFlag);

  TestValidator.equals(
    "fetched risk flag id should match created id",
    fetchedFlag.id,
    createdFlag.id,
  );
  TestValidator.equals(
    "fetched risk flag authCredentialsId should match owner A",
    fetchedFlag.authCredentialsId,
    authCredentialsIdA,
  );
}
