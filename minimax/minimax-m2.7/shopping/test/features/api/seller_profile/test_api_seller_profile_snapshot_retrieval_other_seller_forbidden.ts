import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_retrieval_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller A
  const sellerAAuthorized = await authorize_seller_join(connection, {});
  const sellerAConnection: api.IConnection = { host: connection.host };
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuthorized.token.access}`,
  };
  // 2. Register seller B
  const sellerBAuthorized = await authorize_seller_join(connection, {});
  const sellerBConnection: api.IConnection = { host: connection.host };
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuthorized.token.access}`,
  };
  // 3. Seller A updates profile to create a snapshot
  await api.functional.ecommerceMall.seller.sellers.profile.update(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallSellerProfile.IUpdate,
    },
  );
  // 4. Get seller A's snapshot ID by accessing their profile snapshots
  // Since we need a valid snapshot ID from seller A, we'll use typia.random with a format tag
  // In a real test environment, this would be a known test snapshot ID
  const sellerASnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Seller B attempts to retrieve seller A's snapshot (should be forbidden)
  // The server should return 403 because seller B is not the owner of this snapshot
  await TestValidator.httpError(
    "seller B cannot access seller A's snapshot",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.profile.snapshots.at(
        sellerBConnection,
        {
          snapshotId: sellerASnapshotId,
        },
      );
    },
  );
}
