import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test administrator retrieval of seller profile snapshot history.
 *
 * This test verifies that:
 * 1. Administrator can authenticate and access seller profile snapshots
 * 2. Seller profile updates create immutable snapshots
 * 3. Snapshots are returned in descending order by created_at
 * 4. Each snapshot preserves historical values accurately
 * 5. Pagination metadata correctly reflects total snapshot count
 */
export async function test_api_seller_profile_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create seller account (which creates initial profile)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  // 3. Update seller profile multiple times to create snapshots
  const profileUpdates = ArrayUtil.repeat(3, (index) => ({
    shop_name: `Shop ${RandomGenerator.name()} ${index}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_uri: `https://example.com/logo-${index}.png`,
  }));
  const updatedProfiles: IShoppingMallSellerProfile[] = [];
  for (const update of profileUpdates) {
    const updatedProfile =
      await api.functional.shoppingMall.sellers.profile.update(
        sellerConnection,
        {
          body: {
            shop_name: update.shop_name,
            description: update.description,
            logo_image_uri: update.logo_image_uri,
          } satisfies IShoppingMallSellerProfile.IUpdate,
        },
      );
    typia.assert(updatedProfile);
    updatedProfiles.push(updatedProfile);
  }
  // 4. Retrieve snapshot history as administrator
  const snapshotResponse =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "total snapshot count",
    snapshotResponse.pagination.records,
    profileUpdates.length,
  );
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.equals("total pages", snapshotResponse.pagination.pages, 1);
  // 6. Validate snapshots are in descending order by created_at
  const snapshots = snapshotResponse.data;
  TestValidator.equals(
    "snapshot count matches updates",
    snapshots.length,
    profileUpdates.length,
  );
  for (let i = 0; i < snapshots.length - 1; i++) {
    const current = snapshots[i];
    const next = snapshots[i + 1];
    TestValidator.predicate(
      `snapshots[${i}] created_at >= snapshots[${i + 1}] created_at`,
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // 7. Validate each snapshot contains correct historical values
  // Note: snapshots are in DESC order (newest first), profileUpdates are chronological (oldest first)
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    // Reverse index to match: snapshot[0] (newest) = profileUpdates[2] (last update)
    const expectedUpdate = profileUpdates[profileUpdates.length - 1 - i];
    TestValidator.equals(
      `snapshot[${i}] shop_name`,
      snapshot.shop_name,
      expectedUpdate.shop_name,
    );
    TestValidator.equals(
      `snapshot[${i}] description`,
      snapshot.description,
      expectedUpdate.description,
    );
    TestValidator.equals(
      `snapshot[${i}] logo_image_uri`,
      snapshot.logo_image_uri,
      expectedUpdate.logo_image_uri,
    );
    // Validate snapshot structure
    TestValidator.predicate(
      `snapshot[${i}] has valid UUID`,
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      `snapshot[${i}] has valid timestamp`,
      !isNaN(new Date(snapshot.created_at).getTime()),
    );
  }
}
