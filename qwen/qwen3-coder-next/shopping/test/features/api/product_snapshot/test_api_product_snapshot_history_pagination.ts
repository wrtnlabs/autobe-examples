import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_product_snapshot_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: joinResponse.data.profile.shop_name,
      password: joinResponse.data.profile.shop_name,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Retrieve snapshots with pagination
  const limit = 10;
  const currentPage = 1;
  const snapshotResponse =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerLoginConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate pagination metadata
  const pagination = snapshotResponse.pagination;
  TestValidator.equals(
    "pagination current page",
    pagination.current,
    currentPage,
  );
  TestValidator.equals("pagination limit", pagination.limit, limit);
  TestValidator.predicate("pagination records > 0", pagination.records > 0);
  TestValidator.predicate("pagination pages >= 1", pagination.pages >= 1);
  TestValidator.equals(
    "pagination records match data length",
    pagination.records,
    snapshotResponse.data.length,
  );
  // 6. Validate snapshot data structure
  for (const snapshot of snapshotResponse.data) {
    typia.assert<IShoppingMallProductSnapshot.ISummary>(snapshot);
    TestValidator.equals("snapshot has valid ID", snapshot.id, snapshot.id);
    TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
    TestValidator.predicate("snapshot has base_price", snapshot.base_price > 0);
    typia.assertGuard(
      snapshot.seller.id !== null && snapshot.seller.id !== undefined
        ? snapshot.seller.id
        : null!,
    );
    typia.assertGuard(
      snapshot.category.id !== null && snapshot.category.id !== undefined
        ? snapshot.category.id
        : null!,
    );
  }
  // 7. Test pagination with different page sizes
  const differentLimit = 5;
  const differentPageResponse =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerLoginConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(differentPageResponse);
  TestValidator.equals(
    "pagination limit different",
    differentPageResponse.pagination.limit,
    differentLimit,
  );
  TestValidator.equals(
    "pagination current page different",
    differentPageResponse.pagination.current,
    currentPage,
  );
}
