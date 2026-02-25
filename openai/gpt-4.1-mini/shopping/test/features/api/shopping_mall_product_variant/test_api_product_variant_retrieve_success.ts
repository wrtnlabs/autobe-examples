import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test scenario for successfully retrieving detailed information of a product variant by its ID under a specific product owned by a seller.
 * Verifies authorization, correct variant data including SKU, price override, and stock quantity.
 * Asserts 200 response with full data matching schema.
 * Dependencies include seller registration and login, product creation, and variant creation.
 */
export async function test_api_product_variant_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "pass1234",
      shopName: "Test Shop",
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  typia.assert(seller);
  // Prepare seller authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: seller.token.access,
  };
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description",
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 1000,
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates a product variant for the product
  const variantCreateBody: IShoppingMallProductVariant.ICreate = {
    skuCode: "SKU-123",
    priceOverride: 1100,
    stockQuantity: 10,
  };
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
        body: variantCreateBody,
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant detail by productId and variantId
  const variantDetail =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(variantDetail);
  // 5. Validate the response matches created variant and product linkage
  TestValidator.equals("variant id match", variantDetail.id, variant.id);
  TestValidator.equals(
    "product id match",
    variantDetail.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "sku code match",
    variantDetail.skuCode,
    variantCreateBody.skuCode,
  );
  TestValidator.equals(
    "price override match",
    variantDetail.priceOverride ?? null,
    variantCreateBody.priceOverride ?? null,
  );
  TestValidator.equals(
    "stock quantity match",
    variantDetail.stockQuantity,
    variantCreateBody.stockQuantity,
  );
  // Variant's product summary must link to the product
  TestValidator.equals(
    "linked product id match",
    variantDetail.product?.id ?? null,
    product.id,
  );
  TestValidator.equals(
    "linked product name match",
    variantDetail.product?.name ?? null,
    product.name,
  );
  TestValidator.equals(
    "linked product base price match",
    variantDetail.product?.basePrice ?? null,
    product.basePrice,
  );
  // Assert dates (not null and valid ISO date-time string)
  TestValidator.predicate(
    "createdAt is ISO date-time",
    !isNaN(Date.parse(variantDetail.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    !isNaN(Date.parse(variantDetail.updatedAt)),
  );
  // deletedAt can be null or ISO datetime string
  if (
    variantDetail.deletedAt !== null &&
    variantDetail.deletedAt !== undefined
  ) {
    TestValidator.predicate(
      "deletedAt is ISO date-time",
      !isNaN(Date.parse(variantDetail.deletedAt)),
    );
  }
}
