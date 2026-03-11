import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

export async function test_api_seller_product_image_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A setup - join and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerA);
  // 2. Create product owned by Seller A
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // Verify product ownership
  TestValidator.equals(
    "product belongs to seller A",
    product.seller.id,
    sellerA.id,
  );
  // 3. Seller B setup - join and authenticate (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerB);
  // Verify Seller B is different from Seller A
  TestValidator.notEquals(
    "seller B is different from seller A",
    sellerA.id,
    sellerB.id,
  );
  // 4. Record original image order before unauthorized attempt
  const originalImageIds = product.images.map((img) => img.id);
  // 5. Attempt to manage images on Seller A's product using Seller B's connection
  // This should be rejected with 403 Forbidden
  const manageRequest: IEcommerceMallProductImage.IManageRequest = {
    imageOrders: originalImageIds.map((imageId, index) => ({
      imageId,
      newDisplayOrder: index + 1,
    })),
  };
  await TestValidator.error(
    "seller B cannot manage seller A's product images",
    async () => {
      await api.functional.ecommerceMall.products.images.manage(
        sellerBConnection,
        {
          productId: product.id,
          body: manageRequest,
        },
      );
    },
  );
  // 6. Verify product images remain unchanged
  const currentImageIds = product.images.map((img) => img.id);
  TestValidator.equals(
    "product image order unchanged after unauthorized attempt",
    currentImageIds,
    originalImageIds,
  );
}
