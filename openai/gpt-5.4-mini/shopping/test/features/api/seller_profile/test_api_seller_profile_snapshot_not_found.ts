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
 * Verifies that requesting a missing seller profile snapshot returns not found.
 *
 * This test authenticates an administrator, then requests a seller profile snapshot identifier
 * that is not expected to exist. It validates the endpoint's not-found behavior for absent
 * historical records and ensures no partial snapshot payload is returned.
 *
 * 1. Register an administrator account and obtain an authenticated connection.
 * 2. Request a seller profile snapshot identifier that does not exist.
 * 3. Confirm the API responds with a not-found HTTP error.
 */
export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const missingSellerProfileSnapshotId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  await TestValidator.httpError(
    "missing seller profile snapshot should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.sellerProfileSnapshots.at(
        adminConnection,
        {
          sellerProfileSnapshotId: missingSellerProfileSnapshotId,
        },
      );
    },
  );
}
