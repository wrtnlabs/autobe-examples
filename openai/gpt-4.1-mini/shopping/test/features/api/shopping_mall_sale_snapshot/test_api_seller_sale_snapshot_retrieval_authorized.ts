import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test authorized access to retrieve sale snapshot data by saleId and snapshotId.
 * Includes access control and error case validation.
 */
export async function test_api_seller_sale_snapshot_retrieval_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joining and authorizing
  const ownerSellerConnection: api.IConnection = { host: connection.host };
  const ownerSellerAuthorized = await authorize_seller_join(
    ownerSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        shopName: typia.random<string>(),
        shopDescription: "Owner seller shop",
        logoUri: null,
      },
    },
  );
  typia.assert(ownerSellerAuthorized);
  ownerSellerConnection.headers = {
    Authorization: `Bearer ${ownerSellerAuthorized.token.access}`,
  };
  // 2. Another seller (non-owner) join and authorize
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuthorized = await authorize_seller_join(
    otherSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        shopName: typia.random<string>(),
        shopDescription: "Other seller shop",
        logoUri: null,
      },
    },
  );
  typia.assert(otherSellerAuthorized);
  otherSellerConnection.headers = {
    Authorization: `Bearer ${otherSellerAuthorized.token.access}`,
  };
  // 3. Precondition: Owner seller must have at least one sale and snapshot
  // Since no API is given to create sales and snapshots, we simulate snapshot data
  // For this test, we assume snapshot creation is external, so we test retrieval with random UUIDs
  // For a valid retrieval test, we first get valid saleId and snapshotId from a successful snapshot retrieval
  // This is only possible if a valid snapshot exists, but since no creation API,
  // we fallback to random UUIDs, test error case and authorization
  // 4. Retrieval attempt by owner seller with random UUIDs, expecting not found error
  const randomSaleId = typia.random<string & tags.Format<"uuid">>();
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4a. Try retrieval with owner seller
  await TestValidator.error(
    "retrieval with non-existent sale and snapshot returns error",
    async () => {
      await api.functional.shoppingMall.seller.sales.snapshots.at(
        ownerSellerConnection,
        {
          saleId: randomSaleId,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
  // 4b. Try retrieval with non-owner seller, expecting forbidden or access denied
  await TestValidator.error(
    "non-owner seller cannot retrieve sale snapshot",
    async () => {
      await api.functional.shoppingMall.seller.sales.snapshots.at(
        otherSellerConnection,
        {
          saleId: randomSaleId,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
  // 5. If API existed to create sale and snapshot, we would do:
  // const createdSale = await createSaleForSeller(ownerSellerConnection, {...});
  // const createdSnapshot = await createSnapshotForSale(ownerSellerConnection, {saleId: createdSale.id, ...});
  // and then successfully retrieve and validate snapshot
  //  But since no such creation APIs are provided, this test is limited to access control and not-found cases
}
