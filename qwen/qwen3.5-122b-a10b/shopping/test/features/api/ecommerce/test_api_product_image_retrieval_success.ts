import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_images_create } from "../../../generate/generate_random_ecommerce_seller_products_images_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test successful retrieval of a specific product image by product ID and image ID.
 *
 * Validates the primary success path for viewing product image details in the product gallery. The test ensures that the system correctly retrieves image information including URL, display order, and timestamps when provided with valid product and image identifiers.
 *
 * The workflow follows the natural e-commerce flow: seller authentication, product creation with images, additional image uploads, and then image retrieval verification.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. Seller creates a product with initial images via generate_random_ecommerce_seller_products_create.
 * 3. Seller uploads additional images to the product via generate_random_ecommerce_seller_products_images_create.
 * 4. Retrieve a specific image using api.functional.ecommerce.products.images.at with product ID and image ID.
 * 5. Validate the retrieved image matches the uploaded image (URL, display order, product reference).
 */
export async function test_api_product_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product with initial images
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload additional images to the product
  const additionalImage =
    await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
        } satisfies IEcommerceProductImage.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(additionalImage);
  // 4. Retrieve the specific image
  const retrievedImage = await api.functional.ecommerce.products.images.at(
    sellerConnection,
    {
      productId: product.id,
      imageId: additionalImage.id,
    },
  );
  typia.assert(retrievedImage);
  // 5. Validate the retrieved image matches
  TestValidator.equals(
    "image URL matches",
    retrievedImage.imageUrl,
    additionalImage.imageUrl,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedImage.product.id,
    product.id,
  );
  TestValidator.predicate(
    "display order is non-negative",
    retrievedImage.displayOrder >= 0,
  );
  TestValidator.predicate(
    "has creation timestamp",
    new Date(retrievedImage.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "has update timestamp",
    new Date(retrievedImage.updatedAt).getTime() > 0,
  );
}