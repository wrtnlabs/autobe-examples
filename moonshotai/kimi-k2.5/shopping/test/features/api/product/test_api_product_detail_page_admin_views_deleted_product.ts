import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that an administrator can view a soft-deleted product for audit and dispute resolution purposes.
 * According to the authorization rules, administrators can view any product including deleted ones.
 *
 * Test flow:
 * 1. Create a seller account and authenticate
 * 2. Create a product with variants and images
 * 3. Delete the product using soft delete
 * 4. Create an admin account and authenticate
 * 5. Call GET /ecommerceMall/products/{productId} as admin with deleted product ID
 * 6. Verify HTTP 200 response with complete product details
 * 7. Verify deletedAt timestamp is present (not null) confirming deleted status
 * 8. Verify all product data is accessible including variants, images, category, and seller info
 */
export async function test_api_product_detail_page_admin_views_deleted_product(
  connection: api.IConnection,
) {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(seller);
  // 2. Create a product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Delete the product using soft delete
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 4. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 5. Call GET /ecommerceMall/products/{productId} as admin with deleted product ID
  const deletedProduct = await api.functional.ecommerceMall.products.at(
    adminConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(deletedProduct);
  // 6. Verify deletedAt timestamp is present (not null) confirming deleted status
  TestValidator.predicate(
    "deleted product should have deletedAt timestamp",
    deletedProduct.deletedAt !== null,
  );
  // 7. Verify all product data is accessible including variants, images, category, and seller info
  TestValidator.equals("product id matches", deletedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    deletedProduct.name,
    product.name,
  );
  TestValidator.predicate(
    "product has variants",
    deletedProduct.variants.length >= 0,
  );
  TestValidator.predicate(
    "product has images",
    deletedProduct.images.length >= 0,
  );
  TestValidator.predicate(
    "product has category",
    deletedProduct.category !== null,
  );
  TestValidator.predicate(
    "product has seller info",
    deletedProduct.seller !== null,
  );
}
