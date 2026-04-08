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

export async function test_api_seller_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that an administrator cannot fetch a seller profile that does not exist.
   *
   * This scenario authenticates a dedicated administrator connection and then
   * requests a seller profile identifier that should not be present in the system.
   * The endpoint is expected to fail with a not-found response for absent records,
   * while remaining read-only and not mutating any seller profile state.
   *
   * 1. Authenticate a new administrator connection.
   * 2. Request a non-existent seller profile id.
   * 3. Assert that the API rejects the lookup with a not-found HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator seller profile lookup should fail for a missing record",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.sellerProfiles.at(
        adminConnection,
        { sellerProfileId },
      );
    },
  );
}
