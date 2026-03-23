import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_image_upload_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as seller A to create product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await api.functional.ecommerceMall.auth.seller.join(
    sellerAConnection,
    {
      body: typia.random<IEcommerceMallSeller.IJoin>(),
    },
  );
  typia.assert(sellerA);
  // 2. Auth as seller B (unauthorized seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await api.functional.ecommerceMall.auth.seller.join(
    sellerBConnection,
    {
      body: typia.random<IEcommerceMallSeller.IJoin>(),
    },
  );
  typia.assert(sellerB);
  // 3. Seller A creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller B attempts unauthorized image upload (should fail with 403)
  await TestValidator.httpError(
    "seller B cannot upload images to seller A's product",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.images.upload(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            files: ["image1.jpg", "image2.jpg"],
          } satisfies IEcommerceMallProductImage.IUpload,
        },
      );
    },
  );
}
