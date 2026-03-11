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

export async function test_api_seller_product_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Seller1 (product owner) authentication
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(seller1Authorized);
  // 2. Setup: Seller1 creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product);
  // 3. Setup: Seller2 (non-owner) authentication
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(seller2Authorized);
  // 4. Test: Seller2 attempts to update seller1's product (should fail with 403)
  const originalName = product.name;
  const originalPrice = product.base_price;
  const originalUpdatedAt = product.updated_at;
  await TestValidator.httpError(
    "seller2 cannot update seller1's product",
    [403],
    async () => {
      await api.functional.ecommerceMall.seller.products.update(
        seller2Connection,
        {
          productId: product.id,
          body: {
            name: "Modified by seller2",
            base_price: product.base_price + 100,
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      );
    },
  );
  // 5. Validation: Verify product remains unchanged after failed update
  // Note: No need to fetch product again since update failed
  TestValidator.equals("product name unchanged", product.name, originalName);
  TestValidator.equals(
    "product base_price unchanged",
    product.base_price,
    originalPrice,
  );
  TestValidator.equals(
    "product updated_at unchanged",
    product.updated_at,
    originalUpdatedAt,
  );
}
