import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product to be updated
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Store original values for comparison
  const originalUpdatedAt = product.updated_at;
  const originalName = product.name;
  // 3. Test full update - update all fields
  const fullUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: fullUpdateBody,
    });
  typia.assert(updatedProduct);
  // 4. Validate full update results
  TestValidator.equals("product ID unchanged", updatedProduct.id, product.id);
  TestValidator.equals(
    "name updated",
    updatedProduct.name,
    fullUpdateBody.name,
  );
  TestValidator.equals(
    "description updated",
    updatedProduct.description,
    fullUpdateBody.description,
  );
  TestValidator.equals(
    "category_id updated",
    updatedProduct.category.id,
    fullUpdateBody.category_id,
  );
  TestValidator.equals(
    "base_price updated",
    updatedProduct.base_price,
    fullUpdateBody.base_price,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedProduct.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is later",
    new Date(updatedProduct.updated_at) > new Date(originalUpdatedAt),
  );
  // 5. Validate seller relation is preserved
  TestValidator.equals(
    "seller ID preserved",
    updatedProduct.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email preserved",
    updatedProduct.seller.email,
    sellerEmail,
  );
  // 6. Test partial update - update only name
  const partialUpdateName = RandomGenerator.paragraph({ sentences: 1 });
  const partialUpdateBody = {
    name: partialUpdateName,
  } satisfies IShoppingMallProduct.IUpdate;
  const partiallyUpdatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: updatedProduct.id,
      body: partialUpdateBody,
    });
  typia.assert(partiallyUpdatedProduct);
  // 7. Validate partial update results
  TestValidator.equals(
    "name partially updated",
    partiallyUpdatedProduct.name,
    partialUpdateName,
  );
  TestValidator.equals(
    "description unchanged in partial update",
    partiallyUpdatedProduct.description,
    updatedProduct.description,
  );
  TestValidator.equals(
    "category unchanged in partial update",
    partiallyUpdatedProduct.category.id,
    updatedProduct.category.id,
  );
  TestValidator.equals(
    "base_price unchanged in partial update",
    partiallyUpdatedProduct.base_price,
    updatedProduct.base_price,
  );
  TestValidator.predicate(
    "updated_at refreshed in partial update",
    new Date(partiallyUpdatedProduct.updated_at) >
      new Date(updatedProduct.updated_at),
  );
  // 8. Validate response structure includes all relations
  TestValidator.predicate(
    "seller relation exists",
    partiallyUpdatedProduct.seller !== undefined,
  );
  TestValidator.predicate(
    "category relation exists",
    partiallyUpdatedProduct.category !== undefined,
  );
  TestValidator.predicate(
    "images array exists",
    Array.isArray(partiallyUpdatedProduct.images),
  );
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(partiallyUpdatedProduct.variants),
  );
  TestValidator.predicate(
    "optionDefinitions array exists",
    Array.isArray(partiallyUpdatedProduct.optionDefinitions),
  );
  TestValidator.predicate(
    "rating exists",
    partiallyUpdatedProduct.rating !== undefined,
  );
}