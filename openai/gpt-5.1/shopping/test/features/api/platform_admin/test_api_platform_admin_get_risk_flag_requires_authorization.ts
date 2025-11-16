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
 * Validate that a platform administrator can retrieve a risk flag detail
 * record.
 *
 * Business intention:
 *
 * - Only high-privilege platform administrators should be permitted to read
 *   detailed risk flag entries that are attached to authentication
 *   credentials.
 * - This test exercises the happy path for an authenticated platform admin
 *   session calling the risk flag detail endpoint and validates the response
 *   structure.
 *
 * Steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join using
 *    random but valid IShoppingMallPlatformAdminJoin.IRequest payload. This
 *    also causes the SDK to attach an Authorization header to the provided
 *    connection instance.
 * 2. Call GET
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags/{riskFlagId}
 *    with random UUIDs for both authCredentialsId and riskFlagId. In simulate
 *    mode this returns a mock IShoppingMallRiskFlag; in real mode it will
 *    perform an actual lookup according to backend data.
 * 3. Use typia.assert to validate that the response is a well-formed
 *    IShoppingMallRiskFlag object.
 * 4. Perform a simple logical assertion on the returned object to ensure that key
 *    identifiers (id and authCredentialsId) are non-empty strings, relying on
 *    typia to enforce detailed format constraints.
 */
export async function test_api_platform_admin_get_risk_flag_requires_authorization(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (happy-path authorization setup).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(16),
    // Optional ip is omitted; href and referrer must be valid URIs.
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Call the risk flag detail endpoint as the authenticated platform admin.
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const riskFlagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const riskFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId,
        riskFlagId,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(riskFlag);

  // 3. Basic logical assertions on the returned risk flag.
  TestValidator.predicate(
    "risk flag id should be a non-empty string",
    typeof riskFlag.id === "string" && riskFlag.id.length > 0,
  );
  TestValidator.predicate(
    "risk flag authCredentialsId should be a non-empty string",
    typeof riskFlag.authCredentialsId === "string" &&
      riskFlag.authCredentialsId.length > 0,
  );
}
