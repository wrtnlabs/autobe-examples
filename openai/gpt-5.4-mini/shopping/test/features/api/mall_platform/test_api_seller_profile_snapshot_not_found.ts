import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Ensure seller profile snapshot lookup returns not found for invalid seller ownership.
 *
 * Validates that the administrator-only seller profile snapshot endpoint does not expose historical storefront data when the requested snapshot identifier does not belong to the specified seller profile. This protects preserved shop profile history from incorrect cross-account access and confirms the endpoint remains read-only on failure.
 *
 * The test uses an authenticated administrator context and exercises the negative lookup path.
 * 1. Authenticate an administrator using the supported join flow.
 * 2. Request a seller profile snapshot with random UUID values that are not paired to a real owner/snapshot relationship.
 * 3. Assert the API responds with a not-found HTTP error.
 */
export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "seller profile snapshot should be not found for mismatched seller and snapshot",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.sellers.profile.snapshots.at(
        adminConnection,
        {
          sellerId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
