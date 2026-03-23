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

export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  // 2. Create a product with a category (use the first available category)
  // Since no category listing API exists, create a dummy product first to get a valid category
  const dummyProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        } satisfies DeepPartial<IEcommerceMallProduct.ICreate>,
      },
    );
  typia.assert(dummyProduct);
  const categoryId = dummyProduct.category.id;
  // Create main product with category
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        category_id: categoryId,
        is_available: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload multiple product images (at least 3 for meaningful reordering)
  const uploadedImages: IEcommerceMallProductImage[] = [];
  for (let i = 0; i < 4; i++) {
    const image =
      await api.functional.ecommerceMall.seller.products.images.upload(
        sellerConnection,
        {
          productId: product.id,
          body: {
            files: [
              `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
            ],
          } satisfies IEcommerceMallProductImage.IUpload,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 4. Reorder images with new sort_order sequence
  // Original order: [0,1,2,3] -> New order: [3,1,0,2]
  const pagination =
    await api.functional.ecommerceMall.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          id: uploadedImages[2].id,
          sort_order: 1,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductImage.IRequest,
      },
    );
  typia.assert(pagination);
  // 5. Validate that images are returned in correct order with contiguous 1-based indices
  TestValidator.equals("page count", pagination.data.length, 4);
  TestValidator.predicate("images contiguous 1-based order", () => {
    return pagination.data.every((img, i) => img.sort_order === i + 1);
  });
  // Verify specific reordered order by IDs
  const expectedOrder = [
    uploadedImages[2].id,
    uploadedImages[0].id,
    uploadedImages[3].id,
    uploadedImages[1].id,
  ];
  TestValidator.equals(
    "reorder sequence",
    pagination.data.map((img) => img.id),
    expectedOrder,
  );
}
