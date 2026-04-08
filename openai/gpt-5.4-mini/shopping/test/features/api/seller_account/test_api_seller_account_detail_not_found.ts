import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify administrator seller-account detail lookup returns not found for a missing seller account.
 *
 * Authenticates as an administrator in an isolated connection, then requests a seller account UUID that is not stored in the system.
 * The test confirms the endpoint responds with a not-found error and does not leak a partial seller record, a fallback profile, or unrelated account data.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Request a randomly generated seller account UUID that should not exist.
 * 3. Assert the endpoint returns a not-found HTTP error.
 */
export async function test_api_seller_account_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "test-password" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const missingSellerAccountId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator seller account detail should return not found for a missing id",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.sellerAccounts.at(
        adminConnection,
        {
          sellerAccountId: missingSellerAccountId,
        },
      );
    },
  );
}
