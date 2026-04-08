import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that a seller cannot delete images from another seller's product.
 *
 * Validates the seller ownership constraint enforcement for product image operations.
 * This test ensures that the platform properly protects product data by preventing
 * sellers from modifying images belonging to other sellers' products.
 *
 * **Business Rules Validated**:
 * - Seller ownership constraint (section 593): Only the product owner can modify images
 * - Image access control (section 545): Image modification requires ownership
 * - Sellers cannot access or modify other sellers' product data
 *
 * **Test Flow**:
 * 1. Register and approve Seller A (admin creates category)
 * 2. Seller A creates a product and uploads an image
 * 3. Register and approve Seller B
 * 4. Seller B attempts to delete Seller A's product image
 * 5. Verify the operation returns 403 Forbidden
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller A registers and authenticates successfully.
 * 3. Seller A creates a product with required fields (name, description, basePrice, categoryId).
 * 4. Seller A uploads an image to their product.
 * 5. Seller B registers with different email and authenticates.
 * 6. Seller B creates their own product.
 * 7. Seller B attempts to delete Seller A's image using Seller A's product ID and image ID.
 * 8. System returns 403 Forbidden with permission error message.
 */
export async function test_api_product_image_delete_forbidden_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller A creates a product
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        },
      },
    );
  typia.assert(sellerAProduct);
  // 4. Seller A uploads an image to their product
  const sellerAImage =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerAConnection,
      {
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        },
        params: {
          productId: sellerAProduct.id,
        },
      },
    );
  typia.assert(sellerAImage);
  // 5. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 6. Seller B creates their own product (to be authenticated as valid seller)
  const sellerBProduct =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        },
      },
    );
  typia.assert(sellerBProduct);
  // 7. Seller B attempts to delete Seller A's image (should fail with 403)
  await TestValidator.error(
    "Seller B cannot delete Seller A's product image",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.images.erase(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          imageId: sellerAImage.id,
        },
      );
    },
  );
}
