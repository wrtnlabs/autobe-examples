import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

export async function test_api_sku_variant_retrieval_with_complete_attributes(
  connection: api.IConnection,
) {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "LLC",
      "Corporation",
      "Sole Proprietorship",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  const colorNames = [
    "Navy Blue",
    "Forest Green",
    "Crimson Red",
    "Midnight Black",
    "Pearl White",
  ] as const;
  const colorData = {
    name: RandomGenerator.pick(colorNames),
  } satisfies IShoppingMallSkuColor.ICreate;

  const color: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.create(connection, {
      body: colorData,
    });
  typia.assert(color);

  const sizeValues = [
    "Small",
    "Medium",
    "Large",
    "X-Large",
    "XX-Large",
  ] as const;
  const sizeData = {
    value: RandomGenerator.pick(sizeValues),
  } satisfies IShoppingMallSkuSize.ICreate;

  const size: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: sizeData,
    });
  typia.assert(size);

  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const skuPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<50000>
  >();
  const skuData = {
    sku_code: skuCode,
    price: skuPrice,
  } satisfies IShoppingMallSku.ICreate;

  const createdSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(createdSku);

  const retrievedSku: IShoppingMallSku =
    await api.functional.shoppingMall.products.skus.at(connection, {
      productId: product.id,
      skuId: createdSku.id,
    });
  typia.assert(retrievedSku);

  TestValidator.equals("SKU ID matches", retrievedSku.id, createdSku.id);
  TestValidator.equals("SKU code matches", retrievedSku.sku_code, skuCode);
  TestValidator.equals("SKU price matches", retrievedSku.price, skuPrice);
}
