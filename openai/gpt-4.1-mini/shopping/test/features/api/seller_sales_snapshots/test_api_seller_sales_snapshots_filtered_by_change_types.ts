import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sales_snapshots_filtered_by_change_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins (registers) and gets authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Seller creates a new sale product
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(sale);
  // 3. Define multiple change types for testing filtering
  const changeTypes = ["created", "updated", "price-changed"];
  // 4. Request first page with filter for only some change types
  const filterBody: IShoppingMallSaleSnapshot.IRequest = {
    changeTypes: changeTypes,
    page: 1,
    limit: 20,
  };
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.sales.snapshots.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: filterBody,
      },
    );
  // 5. Validate response schema
  typia.assert(snapshotsResponse);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is correct",
    snapshotsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    snapshotsResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is >= number of data entries",
    snapshotsResponse.pagination.records >= snapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 7. Validate each snapshot belongs to the requested sale and matches filter
  snapshotsResponse.data.forEach((snapshot) => {
    // Snapshot sale must be the same as requested
    TestValidator.equals("snapshot sale id matches", snapshot.sale.id, sale.id);
    // Check that snapshot has a changeType and is among the requested types
    // Since the DTO does not explicitly contain changeType, we rely on title/fields pattern to infer.
    // For robustness, we check if title or description contain at least one of the changeTypes keywords.
    const matchesChangeType = changeTypes.some((type) => {
      const lowerType = type.toLowerCase();
      return (
        snapshot.title.toLowerCase().includes(lowerType) ||
        snapshot.description.toLowerCase().includes(lowerType)
      );
    });
    TestValidator.predicate(
      `snapshot changeType is among requested filter: ${snapshot.id}`,
      matchesChangeType,
    );
  });
}
