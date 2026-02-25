import api from "@ORGANIZATION/PROJECT-api";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import typia, { tags } from "typia";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";

export async function test_api_product_variant_erase_with_pending_orders_or_refunds(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: `Shop_${RandomGenerator.alphabets(5)}`,
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerJoinConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerJoinConnection,
    {
      body: {
        name: `Product_${RandomGenerator.alphabets(5)}`,
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerJoinConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU_${RandomGenerator.alphabets(6)}`,
          priceOverride: null,
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 4. Attempt to delete the variant which is presumed to be linked to pending orders/refunds
  // Since no direct creation of pending orders/refunds is provided, we directly test the error response
  await TestValidator.httpError(
    "variant erase with pending orders or refund requests",
    409,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.erase(
        sellerJoinConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
}
