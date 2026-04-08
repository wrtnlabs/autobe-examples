import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test product image reorder ownership validation.
 *
 * Validates the critical business rule that sellers can only reorder images for products they own. The test creates two separate seller accounts where Seller A owns a product with multiple images, and Seller B attempts to reorder those images. The operation must fail with 403 Forbidden to prevent unauthorized modification of other sellers' product galleries.
 *
 * The test ensures proper isolation between seller accounts and verifies that ownership validation is enforced at the API level. This prevents malicious sellers from tampering with competitors' product presentations.
 *
 * 1. Administrator creates a category for product reference.
 * 2. Seller A (product owner) registers and logs in.
 * 3. Seller A creates a product in the category.
 * 4. Seller A uploads multiple images to their product with different display orders.
 * 5. Seller B (different seller, not product owner) registers and logs in.
 * 6. Seller B attempts to reorder images on Seller A's product.
 * 7. Validates that the operation fails with 403 Forbidden error.
 */
export async function test_api_product_image_reorder_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller A (product owner) registers and logs in
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoin = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAJoin);
  // 3. Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller A uploads multiple images to the product
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 0,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 1,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 2,
        },
      },
    );
  typia.assert(image3);
  // 5. Seller B (different seller, not product owner) registers and logs in
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoin = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerBJoin);
  // 6. Seller B attempts to reorder images on Seller A's product (should fail)
  const reorderRequest: IShoppingMallProductImage.IReorderRequest = {
    images: [
      { imageId: image1.id, displayOrder: 2 },
      { imageId: image2.id, displayOrder: 0 },
      { imageId: image3.id, displayOrder: 1 },
    ],
  } satisfies IShoppingMallProductImage.IReorderRequest;
  // 7. Validate that the operation fails with error (403 Forbidden)
  await TestValidator.error(
    "Seller B cannot reorder images on Seller A's product - ownership validation enforced",
    async () => {
      await api.functional.shoppingMall.seller.products.images.update(
        sellerBConnection,
        {
          productId: product.id,
          body: reorderRequest,
        },
      );
    },
  );
}
