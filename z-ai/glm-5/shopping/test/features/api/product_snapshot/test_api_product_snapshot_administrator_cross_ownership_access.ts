import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_snapshot_administrator_cross_ownership_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(seller);
  // 3. Seller creates a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(product);
  // 4. Seller updates the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Administrator views snapshots for seller's product (cross-ownership access)
  const snapshots = await api.functional.shoppingMall.products.snapshots.index(
    adminConnection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProductSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 6. Validate administrator can access cross-ownership snapshots
  TestValidator.predicate(
    "administrator can view snapshots for product owned by different seller",
    snapshots.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata is present",
    snapshots.pagination.current === 1 && snapshots.pagination.limit === 20,
  );
  // Validate snapshot contains complete preserved state
  const snapshot = snapshots.data[0];
  if (snapshot) {
    TestValidator.predicate(
      "snapshot has name",
      typeof snapshot.name === "string",
    );
    TestValidator.predicate(
      "snapshot has description",
      typeof snapshot.description === "string",
    );
    TestValidator.predicate(
      "snapshot has basePrice",
      typeof snapshot.basePrice === "number",
    );
    TestValidator.predicate(
      "snapshot has images array",
      Array.isArray(snapshot.images),
    );
    TestValidator.predicate(
      "snapshot has createdAt timestamp",
      typeof snapshot.createdAt === "string",
    );
    TestValidator.predicate(
      "snapshot has variantCount",
      typeof snapshot.variantCount === "number",
    );
  }
}
