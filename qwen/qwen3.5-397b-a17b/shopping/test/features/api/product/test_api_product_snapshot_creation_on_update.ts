import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_snapshot_creation_on_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Create category for product
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller setup - create seller account and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 4. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoin.id,
    });
  typia.assert(approvedSeller);
  // 5. Seller logs in with approved account
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 6. Create initial product with specific values
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
        shopping_category_id: category.id,
        base_price: originalBasePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 7. Add product image
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const image = await api.functional.shoppingMall.seller.products.images.create(
    sellerLoginConnection,
    {
      productId: product.id,
      body: {
        image_url: imageUrl,
        display_order: 0,
      } satisfies IShoppingMallProductImage.ICreate,
    },
  );
  typia.assert(image);
  // 8. Add product variant
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const originalVariantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const originalStockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
  >();
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: originalSkuCode,
          price: originalVariantPrice,
          stock_quantity: originalStockQuantity,
          options: [
            {
              key: "color",
              value: "Red",
            },
            {
              key: "size",
              value: "Large",
            },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Store original product state for comparison
  const originalProductState = {
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    category_id: product.category.id,
    image_count: product.images.length,
    variant_count: product.variants.length,
    variant_sku: variant.skuCode,
    variant_price: variant.price,
    variant_stock: variant.stockQuantity,
    variant_options: variant.options.map((opt) => ({
      key: opt.key,
      value: opt.value,
    })),
  };
  // 9. Update product with new values
  const updatedName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          basePrice: updatedBasePrice,
        },
      },
    );
  typia.assert(updatedProduct);
  // 10. Validate that product was updated with new values
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.base_price,
    updatedBasePrice,
  );
  TestValidator.equals(
    "product category unchanged",
    updatedProduct.category.id,
    category.id,
  );
  // 11. Validate that images are preserved after update
  TestValidator.equals(
    "image count preserved",
    updatedProduct.images.length,
    originalProductState.image_count,
  );
  TestValidator.equals(
    "image URL preserved",
    updatedProduct.images[0].image_url,
    imageUrl,
  );
  // 12. Validate that variants are preserved after update
  TestValidator.equals(
    "variant count preserved",
    updatedProduct.variants.length,
    originalProductState.variant_count,
  );
  const updatedVariant = updatedProduct.variants[0];
  TestValidator.equals(
    "variant SKU preserved",
    updatedVariant.skuCode,
    originalProductState.variant_sku,
  );
  TestValidator.equals(
    "variant price preserved",
    updatedVariant.price,
    originalProductState.variant_price,
  );
  TestValidator.equals(
    "variant stock preserved",
    updatedVariant.stockQuantity,
    originalProductState.variant_stock,
  );
  TestValidator.equals(
    "variant options preserved",
    updatedVariant.options.length,
    originalProductState.variant_options.length,
  );
}
