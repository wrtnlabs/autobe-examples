import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_profile_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_seller_profile_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshots_history_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account creation and login
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {});
  // 2. Create multiple seller profile snapshots for filtering and pagination
  const snapshotsUnknown = await ArrayUtil.asyncRepeat(5, async (i: number) => {
    const body: IShoppingMallSellerProfileSnapshot.ICreate = {
      shoppingMallSellerId: typia.random<string & typia.tags.Format<"uuid">>(),
      shopName: `Shop ${i} - ${typia.random<string>()}`,
      shopDescription: `Description for shop ${i}`,
      logoImageUrl: i % 2 === 0 ? `http://logo${i}.com/image.png` : null,
    };
    const snapshot =
      await generate_random_shopping_mall_administrator_seller_profile_snapshots_create(
        adminConnection,
        { body },
      );
    typia.assert<IShoppingMallSellerProfileSnapshot>(snapshot);
    return snapshot;
  });
  const snapshots = snapshotsUnknown as IShoppingMallSellerProfileSnapshot[];
  // 3. Test retrieval with filtering by sellerId
  for (const snapshot of snapshots) {
    typia.assert<IShoppingMallSellerProfileSnapshot>(snapshot);
    const request1: IShoppingMallSellerProfileSnapshot.IRequest = {
      sellerId: snapshot.shoppingMallSellerId,
      offset: 0,
      limit: 10,
      page: 1,
    };
    const response1 =
      await api.functional.shoppingMall.administrator.sellerProfileSnapshots.history.index(
        adminConnection,
        { body: request1 },
      );
    typia.assert(response1);
    TestValidator.predicate(
      `response has data for sellerId ${snapshot.shoppingMallSellerId}`,
      response1.data.length > 0,
    );
    for (const item of response1.data) {
      typia.assert<IShoppingMallSellerProfileSnapshot.ISummary>(item);
      TestValidator.equals(
        `snapshot sellerId for ${item.id}`,
        item.seller.id,
        snapshot.shoppingMallSellerId,
      );
    }
  }
  // 4. Test filtering with createdAt range, shopName, and shopDescription
  const exampleSnapshot = snapshots[0];
  typia.assert<IShoppingMallSellerProfileSnapshot>(exampleSnapshot);
  const createdAtGte = new Date(
    new Date(exampleSnapshot.createdAt).getTime() - 1000 * 60 * 60,
  ).toISOString();
  const createdAtLte = new Date(
    new Date(exampleSnapshot.createdAt).getTime() + 1000 * 60 * 60,
  ).toISOString();
  const request2: IShoppingMallSellerProfileSnapshot.IRequest = {
    sellerId: exampleSnapshot.shoppingMallSellerId,
    createdAtGte,
    createdAtLte,
    shopName: exampleSnapshot.shopName.slice(0, 5),
    shopDescription: exampleSnapshot.shopDescription,
    offset: 0,
    limit: 5,
    page: 1,
  };
  const response2 =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.history.index(
      adminConnection,
      { body: request2 },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "pagination limit respected",
    response2.data.length <= request2.limit!,
  );
  for (const item of response2.data) {
    TestValidator.predicate(
      `createdAt in range for ${item.id}`,
      item.createdAt >= createdAtGte && item.createdAt <= createdAtLte,
    );
    TestValidator.predicate(
      `shopName includes filter for ${item.id}`,
      item.shopName.includes(request2.shopName!),
    );
    TestValidator.predicate(
      `shopDescription matches for ${item.id}`,
      item.shopDescription === request2.shopDescription,
    );
  }
  // 5. Test pagination with offset and page
  const request3: IShoppingMallSellerProfileSnapshot.IRequest = {
    offset: 1,
    limit: 2,
    page: 2,
  };
  const response3 =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.history.index(
      adminConnection,
      { body: request3 },
    );
  typia.assert(response3);
  TestValidator.predicate(
    "pagination obeys limit",
    response3.data.length <= request3.limit!,
  );
  TestValidator.predicate(
    "pagination page correct",
    response3.pagination.current === request3.page!,
  );
  // 6. Access control - unauthorized access
  // Use base connection with no authorization header
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.history.index(
      connection,
      {
        body: {},
      },
    );
  });
}
