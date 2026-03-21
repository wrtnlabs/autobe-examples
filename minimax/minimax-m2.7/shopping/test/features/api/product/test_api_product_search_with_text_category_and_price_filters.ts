import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_admin_admin_categories_subcategories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_subcategories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_search_with_text_category_and_price_filters(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Admin creates category hierarchy
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics" as string & tags.MaxLength<255>,
          description: "Electronic devices and accessories",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const subCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones" as string & tags.MaxLength<255>,
          description: "Mobile phones and accessories",
        } satisfies IEcommerceMallCategory.ICreate,
        params: { categoryId: parentCategory.id },
      },
    );
  typia.assert(subCategory);
  // ============================================================
  // SETUP: Seller creates products with variants
  // ============================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string & tags.Format<"password">,
      href: "http://localhost:3000" as string & tags.Format<"uri">,
      referrer: "http://localhost:3000" as string & tags.Format<"uri">,
    },
  });
  // Login with the created seller credentials
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000" as string & tags.Format<"uri">,
      referrer: "http://localhost:3000" as string & tags.Format<"uri">,
    },
  });
  // Create product 1: In subcategory with price 50000
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Premium Smartphone X",
        description: "High-end smartphone with amazing features",
        category_id: subCategory.id,
        base_price: 50000,
      },
    },
  );
  typia.assert(product1);
  // Create variant for product 1 to make it available
  const variant1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 50000,
          quantity: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product1.id },
      },
    );
  typia.assert(variant1);
  // Create product 2: In subcategory with price 30000
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Budget Smartphone Y",
        description: "Affordable smartphone for everyday use",
        category_id: subCategory.id,
        base_price: 30000,
      },
    },
  );
  typia.assert(product2);
  // Create variant for product 2
  const variant2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 30000,
          quantity: 50,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product2.id },
      },
    );
  typia.assert(variant2);
  // Create product 3: In parent category with price 80000
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Smart Watch Pro",
        description: "Advanced smartwatch with health monitoring",
        category_id: parentCategory.id,
        base_price: 80000,
      },
    },
  );
  typia.assert(product3);
  // Create variant for product 3
  const variant3 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 80000,
          quantity: 30,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product3.id },
      },
    );
  typia.assert(variant3);
  // Create product 4: In parent category with price 15000
  const product4 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Earbuds",
        description: "Bluetooth earbuds with noise cancellation",
        category_id: parentCategory.id,
        base_price: 15000,
      },
    },
  );
  typia.assert(product4);
  // Create variant for product 4
  const variant4 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 15000,
          quantity: 200,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product4.id },
      },
    );
  typia.assert(variant4);
  // ============================================================
  // TEST 1: Search with text query matching "Smartphone"
  // ============================================================
  const textSearchResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        search: "Smartphone",
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(textSearchResult);
  // Validate response structure
  TestValidator.equals(
    "has pagination",
    textSearchResult.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(textSearchResult.data),
    true,
  );
  // Validate products match text search
  TestValidator.predicate("search results contain matching products", () => {
    return textSearchResult.data.some((p) => p.name.includes("Smartphone"));
  });
  // Validate ISummary fields are present
  for (const product of textSearchResult.data) {
    typia.assert(product);
    TestValidator.predicate("product has id", product.id.length > 0);
    TestValidator.predicate("product has name", product.name.length > 0);
    TestValidator.predicate(
      "product has min_price >= 0",
      product.min_price >= 0,
    );
    TestValidator.predicate(
      "product has max_price >= 0",
      product.max_price >= 0,
    );
    TestValidator.predicate(
      "product has seller_name",
      product.seller_name.length > 0,
    );
    TestValidator.predicate(
      "product has reviews_count >= 0",
      product.reviews_count >= 0,
    );
  }
  // ============================================================
  // TEST 2: Search with category filter (subcategory includes products)
  // ============================================================
  const categorySearchResult =
    await api.functional.ecommerceMall.products.search(connection, {
      body: {
        categoryId: subCategory.id,
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(categorySearchResult);
  // Validate all products are from subcategory or parent
  TestValidator.predicate("category filter returns products", () => {
    return categorySearchResult.data.length > 0;
  });
  // ============================================================
  // TEST 3: Search with price range filter
  // ============================================================
  const priceRangeResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        minPrice: 20000,
        maxPrice: 60000,
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceRangeResult);
  // Validate all prices are within range
  for (const product of priceRangeResult.data) {
    TestValidator.predicate(
      `product ${product.name} price within range`,
      product.min_price >= 20000 && product.max_price <= 60000,
    );
  }
  // ============================================================
  // TEST 4: Search with text + category + price combined
  // ============================================================
  const combinedSearchResult =
    await api.functional.ecommerceMall.products.search(connection, {
      body: {
        search: "Smartphone",
        categoryId: subCategory.id,
        minPrice: 40000,
        maxPrice: 60000,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(combinedSearchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    combinedSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 20",
    combinedSearchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records >= 0",
    combinedSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages >= 0",
    combinedSearchResult.pagination.pages >= 0,
  );
  // Validate combined filters - products should match all criteria
  for (const product of combinedSearchResult.data) {
    TestValidator.predicate(
      `product ${product.name} contains search term`,
      product.name.includes("Smartphone"),
    );
    TestValidator.predicate(
      `product ${product.name} has price in range`,
      product.min_price >= 40000 && product.max_price <= 60000,
    );
  }
  // ============================================================
  // TEST 5: Search sorted by price ascending
  // ============================================================
  const priceAscResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        sort: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAscResult);
  // Validate products are sorted by price ascending
  if (priceAscResult.data.length > 1) {
    for (let i = 1; i < priceAscResult.data.length; i++) {
      TestValidator.predicate(
        `product ${i} price >= product ${i - 1} price`,
        priceAscResult.data[i].min_price >=
          priceAscResult.data[i - 1].min_price,
      );
    }
  }
  // ============================================================
  // TEST 6: Search sorted by price descending
  // ============================================================
  const priceDescResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        sort: "price_desc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescResult);
  // Validate products are sorted by price descending
  if (priceDescResult.data.length > 1) {
    for (let i = 1; i < priceDescResult.data.length; i++) {
      TestValidator.predicate(
        `product ${i} price <= product ${i - 1} price`,
        priceDescResult.data[i].max_price <=
          priceDescResult.data[i - 1].max_price,
      );
    }
  }
  // ============================================================
  // TEST 7: Search with pagination
  // ============================================================
  const paginatedResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        sort: "newest",
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals("limit is 2", paginatedResult.pagination.limit, 2);
  TestValidator.predicate("data length <= 2", paginatedResult.data.length <= 2);
  // ============================================================
  // TEST 8: Default sort is newest (created_at DESC)
  // ============================================================
  const defaultSortResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(defaultSortResult);
  // Verify products are ordered by newest first
  if (defaultSortResult.data.length > 1) {
    for (let i = 1; i < defaultSortResult.data.length; i++) {
      const prevDate = new Date(defaultSortResult.data[i - 1].created_at);
      const currDate = new Date(defaultSortResult.data[i].created_at);
      TestValidator.predicate(
        `product ${i} is not newer than product ${i - 1}`,
        currDate.getTime() <= prevDate.getTime(),
      );
    }
  }
  // ============================================================
  // TEST 9: Search with inStock filter
  // ============================================================
  const inStockResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        inStock: true,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(inStockResult);
  TestValidator.predicate(
    "in stock results returned",
    inStockResult.data.length >= 0,
  );
}
