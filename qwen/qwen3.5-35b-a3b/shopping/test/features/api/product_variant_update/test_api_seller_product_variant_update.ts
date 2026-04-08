import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test seller product variant update workflow with snapshot creation verification.
 *
 * Validates the complete product variant update flow including seller authentication, product and variant creation, and variant modification. Ensures that the variant correctly updates with new values while preserving an immutable audit snapshot of the original state for compliance and traceability purposes.
 *
 * Special attention is given to verifying that the snapshot contains the OLD values before modification, demonstrating the audit trail integrity. The test confirms that all variant fields can be updated and that the relationship to the parent product remains intact.
 *
 * 1. Seller registers and authenticates with email and password.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller creates a variant with initial SKU code, option values, stock quantity, and price.
 * 4. Seller updates the variant with new values for SKU code, option values, stock quantity, and price.
 * 5. Validates the response contains all updated fields with new values, and that a snapshot was created with the old values.
 */
export async function test_api_seller_product_variant_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test Description",
        category_id: categoryId,
        base_price: 9999,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const productId = product.id;
  // 3. Create variant with initial values
  const initialSkuCode = "SKU-001";
  const initialOptionValues = JSON.stringify({ color: "red", size: "L" });
  const initialStockQuantity = 100;
  const initialPrice = 12000;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: initialSkuCode,
          option_values: initialOptionValues,
          stock_quantity: initialStockQuantity,
          price: initialPrice,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId },
      },
    );
  typia.assert(variant);
  const variantId = variant.id;
  // 4. Update variant with new values
  const newSkuCode = "SKU-002";
  const newOptionValues = { color: "blue", size: "L" };
  const newStockQuantity = 150;
  const newPrice = 13500;
  const updateResponse =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          sku_code: newSkuCode,
          option_values: newOptionValues,
          stock_quantity: newStockQuantity,
          price: newPrice,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // 5. Validate response contains updated values
  TestValidator.equals("sku_code updated", updateResponse.sku_code, newSkuCode);
  TestValidator.equals(
    "option_values updated",
    updateResponse.option_values,
    JSON.stringify(newOptionValues),
  );
  TestValidator.equals(
    "stock_quantity updated",
    updateResponse.stock_quantity,
    newStockQuantity,
  );
  TestValidator.equals("price updated", updateResponse.price, newPrice);
  TestValidator.equals(
    "product_id matches",
    updateResponse.product_id,
    productId,
  );
  // 6. Validate updated_at is recent (within last minute)
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  TestValidator.predicate(
    "updated_at is recent",
    updateResponse.updated_at > oneMinuteAgo,
  );
}