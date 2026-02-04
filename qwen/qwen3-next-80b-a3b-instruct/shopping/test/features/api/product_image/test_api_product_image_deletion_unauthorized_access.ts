import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_image_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create seller connection and authenticate (first seller)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 3: Seller uploads an image to a product
  // First create a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  // Generate productId before creation since IShoppingMallProduct has empty type
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Create a product owned by the first seller using generated productId
  // Even though IShoppingMallProduct is empty, we must provide productId in request
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        category_id: category.categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Upload an image to the product (owned by first seller)
  const uploadedImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          extension: "jpg",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
        params: {
          productId,
        },
      },
    );
  // Step 4: Create second seller connection and authenticate
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_join(unauthorizedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 5: Attempt to delete image with unauthorized seller (should fail)
  // This should throw HttpError with status 403 (Forbidden)
  await TestValidator.httpError(
    "Unauthorized seller cannot delete another seller's product image",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        unauthorizedSellerConnection, // Using unauthorized seller connection
        {
          productId: productId, // Using the known productId
          imageId: uploadedImage.imageId, // Extracted from upload result
        },
      );
    },
  );
}
