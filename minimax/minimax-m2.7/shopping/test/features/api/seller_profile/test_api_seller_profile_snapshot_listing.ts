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

export async function test_api_seller_profile_snapshot_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  // 2. Create 3 profile snapshots by updating shop name each time
  const shopNames = [
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];
  for (const shopName of shopNames) {
    const profile =
      await api.functional.ecommerceMall.seller.seller.profile.update(
        sellerConnection,
        {
          body: {
            name: shopName,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            logoUri: null,
          } satisfies IEcommerceMallSellerProfile.IUpdate,
        },
      );
    typia.assert(profile);
  }
  // 3. List snapshots with default pagination
  const response =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response contains 3 snapshots
  TestValidator.equals("snapshot count", response.data.length, 3);
  // 5. Verify snapshots are ordered by created_at descending (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const next = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `snapshot ${i} is newer than snapshot ${i + 1}`,
      current >= next,
    );
  }
  // 6. Verify each snapshot has required fields
  for (const snapshot of response.data) {
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has shop_name",
      snapshot.shop_name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
  }
  // 7. Verify snapshot shop_name values match the values from each respective edit
  // Snapshots are ordered newest-first, so reverse the expected order
  const reversedShopNames = [...shopNames].reverse();
  for (let i = 0; i < response.data.length; i++) {
    TestValidator.equals(
      `snapshot ${i} shop_name matches update ${i + 1}`,
      response.data[i].shop_name,
      reversedShopNames[i],
    );
  }
  // 8. Verify pagination metadata
  TestValidator.equals("pagination records", response.pagination.records, 3);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  TestValidator.equals("pagination current", response.pagination.current, 1);
}
