import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_image_upload_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account (join)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // 2. Create a product owned by the seller using the utility function that returns IShoppingMallCustomer
  const productConnection: api.IConnection = { host: connection.host };
  productConnection.headers = sellerConnection.headers;
  // Generate random values that satisfy Minimum<0.01> constraint directly for base_price
  const basePrice = typia.random<number & tags.Minimum<0.01>>();
  // For variant price: generate a number satisfying Minimum<0> (which includes 0.01 and higher)
  // Then use satisfies pattern to convert to required type (number & Minimum<0>) | null | undefined
  const variantPrice = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as (number & tags.Minimum<0>) | null | undefined;
  // Use the generate utility function to create a product
  const product: IShoppingMallCustomer =
    await generate_random_shopping_mall_seller_products_create(
      productConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: basePrice,
          variants: [
            {
              sku_code: RandomGenerator.alphaNumeric(8),
              price: variantPrice,
              options: [{ option_name: "Color", option_value: "Red" }],
            },
          ],
        },
      },
    );
  typia.assert(product);
  // 3. Prepare valid image URL
  const imageUrl =
    `https://example.com/images/${RandomGenerator.alphaNumeric(12)}.jpg` satisfies string &
      tags.Format<"uri">;
  // 4. Upload image to product
  const uploadedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.create(
      productConnection,
      {
        productId: product.id, // Use id from IShoppingMallCustomer return type
        body: {
          image_url: imageUrl,
        } satisfies IShoppingMallProductImage.IUpload,
      },
    );
  typia.assert(uploadedImage);
  // 5. Validate upload response
  TestValidator.equals("image URL matches", uploadedImage.image_url, imageUrl);
  TestValidator.equals(
    "product ID matches",
    uploadedImage.product_id,
    product.id,
  );
  TestValidator.predicate("position is 0", uploadedImage.position === 0);
  TestValidator.equals("image is active", uploadedImage.deleted_at, null);
  TestValidator.equals(
    "product summary matches",
    uploadedImage.product.id,
    product.id,
  );
  // Product summary fields should match what's returned
  // Note: We don't have access to product.name since it's not in IShoppingMallCustomer
  // but it is available in the uploadedImage.product object
  TestValidator.predicate(
    "product summary has name",
    typeof uploadedImage.product.name === "string",
  );
  TestValidator.predicate(
    "product summary has base_price",
    typeof uploadedImage.product.base_price === "number",
  );
  TestValidator.predicate(
    "product summary has category",
    typeof uploadedImage.product.category?.id === "string",
  );
  // Seller summary fields
  TestValidator.equals(
    "product summary seller shop name",
    uploadedImage.product.seller.shop_name,
    "",
  );
  TestValidator.equals(
    "product summary seller logo URL",
    uploadedImage.product.seller.logo_url,
    "",
  );
  TestValidator.equals(
    "product summary seller status",
    uploadedImage.product.seller.status,
    "pending",
  );
}
