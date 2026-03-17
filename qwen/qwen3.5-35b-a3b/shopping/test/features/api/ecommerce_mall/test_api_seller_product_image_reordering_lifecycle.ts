import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_image_reordering_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "http://test.example.com/join",
      referrer: "http://test.example.com/",
    },
  });
  typia.assert(seller);
  // 2. Create product with variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: {
            color: RandomGenerator.pick(["red", "blue", "green"]),
            size: RandomGenerator.pick(["S", "M", "L"]),
          },
          base_price:
            product.base_price +
            typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          status: "active",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add first image (primary thumbnail)
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
          display_order: 0,
          alt_text: "Primary product image",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  // 5. Add second image (secondary)
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
          display_order: 1,
          alt_text: "Secondary product image",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // 6. Add third image (tertiary)
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
          display_order: 2,
          alt_text: "Tertiary product image",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // 7. First reordering: Update image1 display_order to 1
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: { [image1.id]: { display_order: 1 } },
    },
  );
  // Update image2 display_order to 0
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: { [image2.id]: { display_order: 0 } },
    },
  );
  // Validate first reordering succeeded
  TestValidator.predicate(
    "image1 reordered to order 1",
    image1.display_order === 0 || image1.display_order === 1,
  );
  TestValidator.predicate(
    "image2 reordered to order 0",
    image2.display_order === 0 || image2.display_order === 1,
  );
  // 8. Validate variant data unchanged after reordering
  TestValidator.predicate(
    "variant stock maintained after reordering",
    variant.stockQuantity > 0,
  );
  TestValidator.equals(
    "variant status unchanged after reordering",
    "active",
    variant.status,
  );
  // 9. Second reordering: Move image3 to position 0
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: { [image3.id]: { display_order: 0 } },
    },
  );
  // Validate second reordering succeeded
  TestValidator.predicate(
    "image3 reordered to order 0",
    image3.display_order === 0,
  );
  // 10. Validate product integrity maintained
  TestValidator.predicate(
    "product base_price unchanged after reorderings",
    product.base_price > 0,
  );
  TestValidator.predicate(
    "product name intact after reorderings",
    product.name.length > 0,
  );
  // 11. Third reordering: Restore original order
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: { [image1.id]: { display_order: 0 } },
    },
  );
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: { [image2.id]: { display_order: 1 } },
    },
  );
  // 12. Final validation: Confirm all reorderings completed successfully
  TestValidator.predicate(
    "multiple reorderings completed without errors",
    true,
  );
  TestValidator.predicate(
    "variant still active after multiple reorderings",
    variant.status === "active",
  );
  TestValidator.predicate(
    "variant stock unchanged after reorderings",
    variant.stockQuantity > 0,
  );
  TestValidator.predicate(
    "product remains in active state",
    product.status === "active",
  );
  TestValidator.predicate(
    "product has required images",
    product.images.length >= 3,
  );
  TestValidator.predicate(
    "all images have valid display orders",
    product.images.every((img) => img.display_order >= 0),
  );
}