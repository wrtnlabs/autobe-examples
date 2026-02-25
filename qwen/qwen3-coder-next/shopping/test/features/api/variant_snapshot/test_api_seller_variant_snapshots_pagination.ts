import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function test_api_seller_variant_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!@#$",
      shop_name: `Test Shop ${RandomGenerator.alphabets(6)}`,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  // Update sellerConnection with new token from registration response
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerJoinResponse.token.access,
  };
  // 2. Create product with variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000 satisfies number & tags.MultipleOf<0.01>,
        images: [
          {
            image_url: "https://example.com/product.jpg",
            sort_order: 0,
          },
        ] satisfies IShoppingMallProductImage.ICreate[],
        variants: [
          {
            sku_code: `VARIANT-${RandomGenerator.alphabets(8).toUpperCase()}`,
            option_values: [
              { option_name: "Size", option_value: "M" },
              { option_name: "Color", option_value: "Red" },
            ] satisfies IShoppingMallProductVariantOptionValue.ICreate[],
            stock_quantity: 100,
          },
        ] satisfies IShoppingMallProductVariant.ICreate[],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  if (!product.variants || product.variants.length === 0) {
    throw new Error("Product must have at least one variant");
  }
  const variant = product.variants[0];
  // 3. Create multiple variant edits to generate many snapshots for pagination testing
  // Create 15 variant updates to ensure we have more than 10 (default page limit) snapshots
  for (let i = 0; i < 15; i++) {
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: `VARIANT-${RandomGenerator.alphabets(8).toUpperCase()}-UPDATE${i + 1}`,
          price_override: (10000 + i * 1000) as number &
            tags.MultipleOf<1000> satisfies number,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  }
  // 4. Test variant snapshots pagination
  const snapshots = await api.functional.shoppingMall.seller.variants.snapshots(
    sellerConnection,
    {
      variantId: variant.id,
    },
  );
  typia.assert(snapshots);
  // 5. Verify pagination structure and data
  const { pagination, data } = snapshots;
  // Verify pagination structure
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.equals(
    "records count matches data length or more",
    pagination.records,
    data.length,
  );
  TestValidator.predicate("pages is at least 1", pagination.pages >= 1);
  // Verify that we have snapshots
  TestValidator.predicate("has snapshots", data.length > 0);
  // Verify each snapshot has correct structure
  for (const snapshot of data) {
    typia.assert<IShoppingMallProductVariantSnapshot.ISummary>(snapshot);
    TestValidator.equals("has valid ID", typeof snapshot.id, "string");
    TestValidator.equals("has SKU code", typeof snapshot.sku_code, "string");
    TestValidator.equals(
      "has option values JSON",
      typeof snapshot.option_values_json,
      "string",
    );
    TestValidator.equals(
      "has valid created_at",
      typeof snapshot.created_at,
      "string",
    );
    TestValidator.equals(
      "has valid updated_at",
      typeof snapshot.updated_at,
      "string",
    );
  }
}