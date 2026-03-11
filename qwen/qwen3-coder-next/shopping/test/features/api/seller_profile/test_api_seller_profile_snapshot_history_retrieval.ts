import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    },
  });
  // 2. Update seller profile 3 times to create 3 snapshots
  const profile: IEcommerceMallShopProfile.IRequest = {
    page: 1,
    limit: 10,
  };
  for (let i = 0; i < 3; i++) {
    const description = RandomGenerator.paragraph({ sentences: 2 });
    const logo_url = `https://example.com/logo${i}.png`;
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: profile,
      },
    );
    typia.assert(seller);
  }
  // 3. Test scenario 1: Default pagination (first page, 10 items)
  let snapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: profile,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals("default page has data", snapshots.data.length, 3);
  TestValidator.equals(
    "default page is page 1",
    snapshots.pagination.current,
    1,
  );
  // 4. Test scenario 2: Pagination with different page size
  snapshots = await api.functional.ecommerceMall.seller.profile.snapshots.index(
    sellerConnection,
    {
      body: { ...profile, page: 1, limit: 20 },
    },
  );
  typia.assert(snapshots);
  TestValidator.equals("large page size", snapshots.data.length, 3);
  // 5. Test scenario 3: Timestamp-based cursor filtering
  const beforeTimestamp = snapshots.data[snapshots.data.length - 1].created_at;
  snapshots = await api.functional.ecommerceMall.seller.profile.snapshots.index(
    sellerConnection,
    {
      body: { ...profile, before: beforeTimestamp },
    },
  );
  typia.assert(snapshots);
  // 6. Test scenario 4: New seller with no snapshots
  const newSellerConnection: api.IConnection = { host: connection.host };
  const newSeller = await authorize_seller_join(newSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    },
  });
  snapshots = await api.functional.ecommerceMall.seller.profile.snapshots.index(
    newSellerConnection,
    {
      body: profile,
    },
  );
  typia.assert(snapshots);
  TestValidator.equals("empty result for new seller", snapshots.data.length, 0);
  TestValidator.equals(
    "empty pagination metadata",
    snapshots.pagination.records,
    0,
  );
  // 7. Test scenario 5: Verify pagination metadata is correct
  snapshots = await api.functional.ecommerceMall.seller.profile.snapshots.index(
    sellerConnection,
    {
      body: profile,
    },
  );
  typia.assert(snapshots);
  TestValidator.equals("correct record count", snapshots.pagination.records, 3);
  TestValidator.equals("correct pages count", snapshots.pagination.pages, 1);
}
