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

export async function test_api_product_image_upload_with_maximum_limit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create product with category
  const category = typia.random<IShoppingMallCategory.ISummary>();
  const product: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category_id: category.id,
    base_price: typia.random<number & tags.Minimum<0.01>>(),
    variants: [
      {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: (typia.random<number & tags.Minimum<0.01>>() satisfies number as number),
        options: [
          {
            option_name: "Color",
            option_value: RandomGenerator.name(1),
          },
        ],
      },
    ] satisfies IShoppingMallProductVariant.ICreate[],
  };
  const createdProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: product,
    });
  typia.assert(createdProduct);
  const productId = createdProduct.id;
  // 3. Upload exactly 10 images to reach maximum limit
  const imageCount = 10;
  const imageUrls: string[] = ArrayUtil.repeat(
    imageCount,
    () => `https://example.com/images/${RandomGenerator.alphaNumeric(20)}.jpg`,
  );
  // Create image upload requests with unique URLs
  const imageUploads: IShoppingMallProductImage.IUpload[] = imageUrls.map(
    (url) =>
      ({
        image_url: url,
      }) satisfies IShoppingMallProductImage.IUpload,
  );
  // Upload each image
  for (const upload of imageUploads) {
    await api.functional.shoppingMall.seller.products.images.create(
      sellerConnection,
      {
        productId,
        body: upload,
      },
    );
  }
  // 4. Attempt to upload 11th image (should fail)
  const eleventhImageUrl = `https://example.com/images/${RandomGenerator.alphaNumeric(20)}.jpg`;
  const eleventhImageUpload: IShoppingMallProductImage.IUpload = {
    image_url: eleventhImageUrl,
  } satisfies IShoppingMallProductImage.IUpload;
  // Verify that attempting to upload the 11th image throws HTTP 400 error
  await TestValidator.httpError(
    "uploading 11th image should fail with 400",
    400,
    async () => {
      await api.functional.shoppingMall.seller.products.images.create(
        sellerConnection,
        {
          productId,
          body: eleventhImageUpload,
        },
      );
    },
  );
  // 5. Confirm that existing images remain unchanged (no snapshot created)
  // Note: Since we're not detecting snapshot creation (which would be an internal implementation detail)
  // we verify the maximum limit is enforced by the error condition
}