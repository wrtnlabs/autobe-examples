import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_access_denied_to_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAResult = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller-a",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerAResult);
  // 2. Update Seller A's profile to generate a snapshot
  const updatedProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Get Seller A's snapshots to retrieve the snapshotId
  const snapshotsResult =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResult);
  // Get the first snapshot ID from Seller A
  const sellerASnapshotId = snapshotsResult.data[0].id;
  // 4. Register and authenticate as Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller-b",
      referrer: "https://example.com",
    },
  });
  // 5. Seller B attempts to access Seller A's snapshot - should be denied
  await TestValidator.error(
    "Seller B cannot access Seller A's profile snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.seller_profile_snapshots.at(
        sellerBConnection,
        {
          snapshotId: sellerASnapshotId,
        },
      );
    },
  );
}
