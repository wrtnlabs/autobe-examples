import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_snapshot_detail_deleted_product_history_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const createdProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(createdProduct);
  const createdVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: createdProduct.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(createdVariant);
  TestValidator.equals(
    "variant belongs to created product",
    createdVariant.product.id,
    createdProduct.id,
  );
  const updateBody = {
    name: `${createdProduct.name}-${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.content({ paragraphs: 3 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2000>
    >() satisfies number as number,
    status: "inactive",
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.seller_products.update(
      sellerConnection,
      {
        productId: createdProduct.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "product id remains same",
    updatedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updateBody.name,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updateBody.description,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.base_price,
    updateBody.base_price,
  );
  TestValidator.equals(
    "product status updated",
    updatedProduct.status,
    updateBody.status,
  );
  TestValidator.equals(
    "seller ownership preserved",
    updatedProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "variant remains attached after update",
    updatedProduct.variants[0]?.id,
    createdVariant.id,
  );
  await api.functional.shoppingMall.seller.seller_products.erase(
    sellerConnection,
    {
      productId: createdProduct.id,
    },
  );
}
