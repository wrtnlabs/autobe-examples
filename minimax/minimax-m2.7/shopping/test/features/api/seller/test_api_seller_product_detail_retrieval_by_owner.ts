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

/**
 * Test retrieving product details as the owning seller.
 *
 * Validates the complete product detail retrieval flow for an authenticated seller.
 * Verifies that when a seller retrieves their own product, all fields are properly
 * populated including nested relations (category, seller profile), arrays (images,
 * variants), and timestamps. Ensures the seller can access the full product record
 * they created.
 *
 * 1. Seller authenticates via join endpoint to obtain session token.
 * 2. Seller creates a product with required fields (name, description, category, base price).
 * 3. Seller retrieves the created product using GET /seller/sellers/me/products/{productId}.
 * 4. Validates product details match creation input:
 *    - Product ID, name, description, base price
 *    - Category with id, name, description
 *    - Seller profile with shop name
 *    - Empty images and variants arrays (none created in this test)
 *    - Valid timestamps (createdAt, updatedAt)
 *    - Soft delete timestamp is null (active product)
 */
export async function test_api_seller_product_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Retrieve the created product
  const retrieved =
    await api.functional.ecommerceMall.seller.sellers.me.products.at(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate retrieved product details
  TestValidator.equals("product ID matches", retrieved.id, product.id);
  TestValidator.equals("product name matches", retrieved.name, product.name);
  TestValidator.equals(
    "product description matches",
    retrieved.description,
    product.description,
  );
  TestValidator.equals(
    "base price matches",
    retrieved.basePrice,
    product.basePrice,
  );
  TestValidator.equals(
    "category id matches",
    retrieved.category.id,
    product.category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrieved.category.name,
    product.category.name,
  );
  TestValidator.equals("seller id matches", retrieved.seller.id, seller.id);
  TestValidator.equals(
    "seller shop name matches",
    retrieved.seller.name,
    seller.profile.name,
  );
  TestValidator.equals("deletedAt is null", retrieved.deletedAt, null);
  TestValidator.predicate(
    "has valid createdAt",
    retrieved.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has valid updatedAt",
    retrieved.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "has valid timestamps",
    retrieved.createdAt <= retrieved.updatedAt,
  );
}
