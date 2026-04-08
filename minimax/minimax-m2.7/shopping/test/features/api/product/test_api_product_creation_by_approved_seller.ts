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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Admin creates a product category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(category);
  // 3. Setup: Register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
    },
  });
  // 4. Setup: Login as approved seller (assuming auto-approval or pre-approved seller)
  // For this test, we login with the seller credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/",
    },
  });
  // 5. Create product with specific test data
  const productName = "Premium Wireless Headphones";
  const productDescription =
    "High-quality Bluetooth headphones with noise cancellation and 30-hour battery life";
  const basePrice = 199.99;
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: productName,
          description: productDescription,
          categoryId: category.id,
          basePrice: basePrice,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 6. Validate product creation
  TestValidator.equals("product has valid UUID", product.id.length, 36);
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals(
    "product description matches",
    product.description,
    productDescription,
  );
  TestValidator.equals("basePrice matches", product.basePrice, basePrice);
  TestValidator.equals("deletedAt is null", product.deletedAt, null);
  TestValidator.equals(
    "inStock is false (no variants)",
    product.inStock,
    false,
  );
  TestValidator.equals(
    "ratingAverage is null (no reviews)",
    product.ratingAverage,
    null,
  );
  TestValidator.equals("ratingCount is zero", product.ratingCount, 0);
  TestValidator.equals("images array is empty", product.images.length, 0);
  TestValidator.equals("variants array is empty", product.variants.length, 0);
  // Validate category association
  TestValidator.equals("category id matches", product.category.id, category.id);
  TestValidator.equals(
    "category name matches",
    product.category.name,
    category.name,
  );
  // Validate seller association
  TestValidator.equals("seller object exists", product.seller !== null, true);
}
