import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a product with a variant
  const productCreateResponse =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 49.99,
          variants: [
            {
              sku_code: "SKU123",
              price: 29.99,
              options: [
                { option_name: "color", option_value: "Red" },
                { option_name: "size", option_value: "M" },
              ],
            } satisfies IShoppingMallProductVariant.ICreate,
          ],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(productCreateResponse);
  // 3. Extract productId and variantId
  // The utility returns IShoppingMallCustomer but simulation returns product info with variants
  const productId = productCreateResponse.id as string;
  // We need to extract variantId from the variants array
  const variants = (productCreateResponse as any)
    .variants as IShoppingMallProductVariant[];
  if (!variants || variants.length === 0) {
    throw new Error("No variants found in product creation response");
  }
  const variantId = variants[0].id;
  // 4. Update the variant using SDK (no utility exists for this endpoint)
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          sku_code: "SKU456",
          price: 39.99,
          options: [
            { option_name: "color", option_value: "Blue" },
            { option_name: "size", option_value: "L" },
          ],
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate product variant update
  TestValidator.equals("SKU code updated", updatedVariant.sku_code, "SKU456");
  TestValidator.equals("Price updated", updatedVariant.price, 39.99);
  // Validate updated_at is newer
  // Since IShoppingMallProductVariant does not have an options property,
  // we cannot validate those options directly in the test response
  // The options are part of the variant data but not exposed in the IShoppingMallProductVariant type
  // We can only validate properties that are part of the official interface
  const originalVariant = variants[0];
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedVariant.updated_at).getTime() >
      new Date(originalVariant.updated_at).getTime(),
  );
}
