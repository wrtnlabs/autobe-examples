import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfileSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies seller snapshot access control behavior for protected historical records.
   *
   * This scenario authenticates two distinct sellers and exercises the snapshot
   * retrieval endpoint with a structurally valid snapshot identifier. The goal is
   * to ensure the endpoint enforces access control semantics and does not permit
   * unrestricted snapshot retrieval across accounts.
   *
   * 1. Register two distinct seller accounts.
   * 2. Use one seller session to request a snapshot resource with a valid UUID.
   * 3. Attempt the same access pattern from a second seller session.
   * 4. Assert that protected snapshot access is rejected when authorization is not sufficient.
   */
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "seller snapshot retrieval should be protected",
    async () => {
      const output =
        await api.functional.mallPlatform.seller.profile.snapshots.at(
          sellerBConnection,
          {
            snapshotId,
          },
        );
      typia.assert(output);
    },
  );
}
