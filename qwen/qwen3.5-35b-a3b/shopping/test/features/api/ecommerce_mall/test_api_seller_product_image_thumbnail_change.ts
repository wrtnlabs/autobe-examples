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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_seller_product_image_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Thumbnail Change",
        description: "Product for testing image thumbnail reordering",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create first image (display_order=0, current thumbnail)
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://example.com/image1.jpg",
          display_order: 0,
          alt_text: "First image (original thumbnail)",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  // 4. Create second image (display_order=1)
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://example.com/image2.jpg",
          display_order: 1,
          alt_text: "Second image",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // 5. Create third image (display_order=2)
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://example.com/image3.jpg",
          display_order: 2,
          alt_text: "Third image",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // Store initial state for validation
  const initialOrder = {
    image1: image1.display_order,
    image2: image2.display_order,
    image3: image3.display_order,
  };
  TestValidator.equals("image1 starts at order 0", initialOrder.image1, 0);
  TestValidator.equals("image2 starts at order 1", initialOrder.image2, 1);
  TestValidator.equals("image3 starts at order 2", initialOrder.image3, 2);
  // 6. Reorder: Move image2 to display_order=0 (new primary thumbnail)
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: {
        image_url: image2.image_url,
        display_order: 0,
        alt_text: image2.alt_text,
      },
    },
  );
  // 7. Reorder: Move image1 to display_order=1 (secondary)
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: {
        image_url: image1.image_url,
        display_order: 1,
        alt_text: image1.alt_text,
      },
    },
  );
  // 8. Reorder: Keep image3 at display_order=2 (or move if it was changed)
  await api.functional.ecommerceMall.seller.products.images.patchByProductid(
    sellerConnection,
    {
      productId: product.id,
      body: {
        image_url: image3.image_url,
        display_order: 2,
        alt_text: image3.alt_text,
      },
    },
  );
  // 9. Validate all images maintain continuous display_order sequence
  TestValidator.equals(
    "image2 now has order 0 (new thumbnail)",
    image2.display_order,
    0,
  );
  TestValidator.equals(
    "image1 now has order 1 (secondary)",
    image1.display_order,
    1,
  );
  TestValidator.equals("image3 maintains order 2", image3.display_order, 2);
  // 10. Verify no duplicate orders exist
  const orders = [
    image1.display_order,
    image2.display_order,
    image3.display_order,
  ];
  const uniqueOrders = new Set(orders);
  TestValidator.equals(
    "no duplicate orders exist",
    uniqueOrders.size,
    orders.length,
  );
  // 11. Verify continuous sequence (0, 1, 2) - sorted order
  const sortedOrders = [...orders].sort((a, b) => a - b);
  const expectedSequence = [0, 1, 2];
  for (let i = 0; i < sortedOrders.length; i++) {
    TestValidator.equals(
      `order position ${i} is correct`,
      sortedOrders[i],
      expectedSequence[i],
    );
  }
}
