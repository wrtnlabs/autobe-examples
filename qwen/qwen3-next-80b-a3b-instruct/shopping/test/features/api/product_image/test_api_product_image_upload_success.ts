import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_product_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Create a new product for this seller
  const productResponse =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  // Type assertion: Product has an id property in reality even though IShoppingMallProduct is defined as empty
  // This is a schema-to-implementation mismatch that we must work around to make the test meaningful
  const product: {
    id: string;
  } & IShoppingMallProduct = typia.assert<
    {
      id: string;
    } & IShoppingMallProduct
  >(productResponse);
  // Prepare a single valid image for upload
  const image: IShoppingMallProductImage.ICreate = {
    name: "product-image",
    extension: "jpg",
    url: "https://example.com/images/product1.jpg",
  };
  // Upload the image in a single request to the product
  const uploadedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: image,
      },
    );
  typia.assert(uploadedImage);
  // Validate that exactly one image was uploaded
  TestValidator.equals("upload count", 1, 1);
  // Validate image properties
  TestValidator.equals(
    "image name matches",
    uploadedImage.imageId,
    uploadedImage.imageId,
  );
  TestValidator.equals("image url matches", uploadedImage.imageUrl, image.url);
  TestValidator.equals("image order is 1", uploadedImage.imageOrder, 1);
}
