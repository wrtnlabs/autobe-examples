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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_soft_deleted_product_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a test product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Delete the product (soft delete)
  await api.functional.ecommerceMall.seller.sellers.me.products.erase(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  // 4. Retrieve the soft-deleted product
  const deletedProduct =
    await api.functional.ecommerceMall.seller.sellers.me.products.at(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(deletedProduct);
  // 5. Validate response
  // Product data should be returned with deleted_at populated
  TestValidator.equals("product id matches", deletedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    deletedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    deletedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "base price matches",
    deletedProduct.basePrice,
    product.basePrice,
  );
  TestValidator.predicate(
    "deleted_at is populated",
    deletedProduct.deletedAt !== null,
  );
  TestValidator.equals(
    "seller info present",
    deletedProduct.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "category info present",
    deletedProduct.category.id,
    product.category.id,
  );
  TestValidator.equals(
    "images array included",
    deletedProduct.images.length,
    product.images.length,
  );
  TestValidator.equals(
    "variants array included",
    deletedProduct.variants.length,
    product.variants.length,
  );
}
