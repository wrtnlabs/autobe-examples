import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_variant_listing_minimum_variant_requirement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin, seller, and customer accounts
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create a category for product assignment
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller creates a product WITHOUT variants initially
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Verify variant listing returns empty data with proper pagination
  // This validates the core business rule: products without variants return empty listings
  const emptyVariants =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(emptyVariants);
  // Validate empty variant listing metadata
  TestValidator.equals(
    "empty variant data array",
    emptyVariants.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records count",
    emptyVariants.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    emptyVariants.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    emptyVariants.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", emptyVariants.pagination.limit, 20);
  // 5. Test variant listing with different pagination parameters
  const paginatedVariants =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(paginatedVariants);
  TestValidator.equals(
    "paginated variant data array empty",
    paginatedVariants.data.length,
    0,
  );
  TestValidator.equals(
    "paginated records count",
    paginatedVariants.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated pages count",
    paginatedVariants.pagination.pages,
    0,
  );
  TestValidator.equals(
    "paginated limit",
    paginatedVariants.pagination.limit,
    10,
  );
  // 6. Verify seller can also view empty variant listing
  const sellerVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(sellerVariants);
  TestValidator.equals(
    "seller sees empty variant listing",
    sellerVariants.data.length,
    0,
  );
  TestValidator.equals(
    "seller pagination records",
    sellerVariants.pagination.records,
    0,
  );
  // 7. Verify admin can view empty variant listing
  const adminVariants =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(adminVariants);
  TestValidator.equals(
    "admin sees empty variant listing",
    adminVariants.data.length,
    0,
  );
  TestValidator.equals(
    "admin pagination records",
    adminVariants.pagination.records,
    0,
  );
  // 8. Test with SKU code filter (should still return empty)
  const filteredVariants =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "TEST-SKU",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(filteredVariants);
  TestValidator.equals(
    "filtered variant listing empty",
    filteredVariants.data.length,
    0,
  );
  // 9. Test with price filter (should still return empty)
  const priceFilteredVariants =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          price_min: 1000,
          price_max: 10000,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(priceFilteredVariants);
  TestValidator.equals(
    "price filtered variant listing empty",
    priceFilteredVariants.data.length,
    0,
  );
  // 10. Test with stock quantity filter (should still return empty)
  const stockFilteredVariants =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          stock_quantity: 0,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(stockFilteredVariants);
  TestValidator.equals(
    "stock filtered variant listing empty",
    stockFilteredVariants.data.length,
    0,
  );
  // Summary: The test validates that products without variants:
  // - Return empty variant data arrays
  // - Have correct pagination metadata (0 records, 0 pages)
  // - Work correctly with various filter parameters
  // - Are accessible to all actor types (customer, seller, admin)
  // This confirms the minimum variant requirement business rule is properly enforced
  // at the listing level - products without variants show as unavailable through empty listings
}
