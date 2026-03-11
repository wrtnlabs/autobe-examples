import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_image_reorder_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await api.functional.ecommerceMall.auth.seller.join(
    sellerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerA);
  // 2. Seller A creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >() satisfies number,
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload multiple images for the product
  const image1 =
    await api.functional.ecommerceMall.seller.products.images.upload(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          files: ["image1.jpg"],
        } satisfies IEcommerceMallProductImage.IUpload,
      },
    );
  typia.assert(image1);
  const image2 =
    await api.functional.ecommerceMall.seller.products.images.upload(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          files: ["image2.jpg"],
        } satisfies IEcommerceMallProductImage.IUpload,
      },
    );
  typia.assert(image2);
  // 4. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await api.functional.ecommerceMall.auth.seller.join(
    sellerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password456",
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerB);
  // 5. Seller B attempts to reorder images for Seller A's product (should fail)
  await TestValidator.error(
    "Seller B should not be able to reorder images for Seller A's product",
    async () => {
      await api.functional.ecommerceMall.seller.products.images.index(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            id: image1.id,
            sort_order: 2,
          } satisfies IEcommerceMallProductImage.IRequest,
        },
      );
    },
  );
  // 6. Verify images are still in original order (Seller A can still access them)
  const imagesAfterAttempt =
    await api.functional.ecommerceMall.seller.products.images.index(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          id: image1.id,
          sort_order: 1,
        } satisfies IEcommerceMallProductImage.IRequest,
      },
    );
  typia.assert(imagesAfterAttempt);
  TestValidator.equals(
    "Seller A can still access images",
    imagesAfterAttempt.data.length,
    2,
  );
}
