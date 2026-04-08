import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_variant_listing_with_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category for the product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. List variants with inStock=true filter
  const inStockResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: true,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockResult);
  // 5. List variants with inStock=false filter
  const outOfStockResult =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: false,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(outOfStockResult);
  // 6. Validate pagination structure for inStock=true response
  TestValidator.predicate(
    "pagination exists",
    inStockResult.pagination !== null,
  );
  TestValidator.predicate("data is array", Array.isArray(inStockResult.data));
  // 7. Validate pagination structure for inStock=false response
  TestValidator.predicate(
    "pagination exists for out-of-stock",
    outOfStockResult.pagination !== null,
  );
  TestValidator.predicate(
    "data is array for out-of-stock",
    Array.isArray(outOfStockResult.data),
  );
  // 8. Validate variant fields structure if data exists
  for (const variant of inStockResult.data) {
    TestValidator.predicate("variant has id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has sku_code",
      variant.sku_code !== undefined,
    );
    TestValidator.predicate("variant has price", variant.price !== undefined);
    TestValidator.predicate(
      "variant has quantity",
      variant.quantity !== undefined,
    );
    TestValidator.predicate(
      "variant has in_stock",
      variant.in_stock !== undefined,
    );
    TestValidator.predicate(
      "variant has optionValues array",
      Array.isArray(variant.optionValues),
    );
    TestValidator.predicate(
      "variant has product context",
      variant.product !== undefined,
    );
    TestValidator.predicate(
      "in_stock matches quantity > 0",
      variant.in_stock === variant.quantity > 0,
    );
    TestValidator.equals("product id matches", variant.product.id, product.id);
  }
  // 9. Validate variant fields structure for out-of-stock variants
  for (const variant of outOfStockResult.data) {
    TestValidator.predicate("variant has id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has sku_code",
      variant.sku_code !== undefined,
    );
    TestValidator.predicate("variant has price", variant.price !== undefined);
    TestValidator.predicate(
      "variant has quantity",
      variant.quantity !== undefined,
    );
    TestValidator.predicate(
      "variant has in_stock",
      variant.in_stock !== undefined,
    );
    TestValidator.predicate(
      "variant has optionValues array",
      Array.isArray(variant.optionValues),
    );
    TestValidator.predicate(
      "variant has product context",
      variant.product !== undefined,
    );
    TestValidator.predicate(
      "in_stock matches quantity = 0",
      variant.in_stock === false,
    );
    TestValidator.equals("product id matches", variant.product.id, product.id);
  }
}
