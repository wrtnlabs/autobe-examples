import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that an administrator can successfully retrieve a product image by its unique identifier.
 *
 * Validates the primary success path for administrator image retrieval. An administrator account is created and authenticated, a seller account is created and authenticated, the seller creates a product and uploads an image (auto-assigned sort_order 0 as thumbnail), then the administrator retrieves the image by product and image UUID. The response is validated to match the expected schema with all fields correctly populated.
 *
 * 1. Administrator account is created and authenticated via `authorize_administrator_join`.
 * 2. Seller account is created and authenticated via `authorize_seller_join`.
 * 3. Seller creates a product using `generate_random_e_commerce_mall_seller_products_create`.
 * 4. Seller uploads an image to the product using `generate_random_e_commerce_mall_seller_products_images_create` (auto-assigned sort_order 0 as thumbnail).
 * 5. Administrator retrieves the image via `api.functional.eCommerceMall.administrator.products.images.at`.
 * 6. Validates the response: id matches requested imageId, sort_order is 0, product summary has correct id/name/visibility/thumbnail, and timestamps are ISO date-time strings (verified by typia.assert).
 */
export async function test_api_administrator_product_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  // 3. As seller, create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. As seller, upload an image to the product
  const image =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(image);
  // 5. As administrator, retrieve the image by productId and imageId
  const retrieved =
    await api.functional.eCommerceMall.administrator.products.images.at(
      adminConnection,
      {
        productId: product.id,
        imageId: image.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate business logic expectations
  TestValidator.equals("image id matches", retrieved.id, image.id);
  TestValidator.equals("sort_order is 0 (thumbnail)", retrieved.sort_order, 0);
  TestValidator.equals("product id matches", retrieved.product.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrieved.product.name,
    product.name,
  );
  TestValidator.equals(
    "product visibility is visible",
    retrieved.product.visibility,
    "visible",
  );
  TestValidator.equals(
    "thumbnail url matches image url",
    retrieved.product.thumbnail,
    retrieved.url,
  );
}
