import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function test_api_product_snapshot_retrieve_own_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const sellerPassword = "password1234";
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorized);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Original ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 1000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const liveBefore = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: `Updated ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        basePrice: 2000,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(liveBefore);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const retrieved =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("snapshot product id", retrieved.product.id, product.id);
  TestValidator.equals(
    "snapshot summary product id",
    retrieved.product.id,
    product.id,
  );
  TestValidator.predicate(
    "snapshot version is positive",
    retrieved.snapshotVersion > 0,
  );
  TestValidator.predicate(
    "snapshot capturedAt is date-time",
    retrieved.capturedAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt is date-time",
    retrieved.createdAt.length > 0,
  );
  TestValidator.predicate("snapshot has name", retrieved.name.length > 0);
  TestValidator.predicate(
    "snapshot has description",
    retrieved.descriptionText.length > 0,
  );
  TestValidator.predicate("snapshot has price", retrieved.basePrice > 0);
  const liveAfter = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: `Final ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        basePrice: 3000,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(liveAfter);
  TestValidator.notEquals(
    "live product name changed from snapshot",
    liveAfter.name,
    retrieved.name,
  );
  TestValidator.notEquals(
    "live product description changed from snapshot",
    liveAfter.description,
    retrieved.descriptionText,
  );
  TestValidator.notEquals(
    "live product price changed from snapshot",
    liveAfter.basePrice,
    retrieved.basePrice,
  );
}
