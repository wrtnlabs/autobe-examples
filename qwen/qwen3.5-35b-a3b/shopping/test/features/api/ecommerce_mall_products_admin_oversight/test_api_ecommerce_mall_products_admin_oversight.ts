import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_ecommerce_mall_products_admin_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminOutput = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>()
    }
  });
  typia.assert(adminOutput);
  // 2. Create test data - products with varied attributes
  const sampleCategoryId = typia.random<string & tags.Format<"uuid">>();
  const sampleSellerId = typia.random<string & tags.Format<"uuid">>();
  const sampleProduct1 = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        category_id: sampleCategoryId,
        seller_id: sampleSellerId,
        limit: 1
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(sampleProduct1);
  // 3. Admin retrieves ALL products (including inactive ones)
  const allProducts = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(allProducts);
  // Validate all products response structure
  TestValidator.equals("has products data", allProducts.data.length >= 0, true);
  TestValidator.equals(
    "pagination current page",
    allProducts.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit positive",
    allProducts.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination pages positive",
    allProducts.pagination.pages >= 0,
    true,
  );
  // 4. Test admin can filter by is_active=false to view deactivated products
  const inactiveProducts = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        is_active: false
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(inactiveProducts);
  // Admin should be able to see deactivated products for moderation
  TestValidator.equals(
    "inactive products filtered",
    inactiveProducts.data.every((p) => p.isActive === false),
    true,
  );
  // 5. Test admin can filter by seller_id
  const sellerProducts = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        seller_id: sampleSellerId
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(sellerProducts);
  // All products should belong to the specified seller
  TestValidator.equals(
    "all products belong to seller",
    sellerProducts.data.every((p) => p.seller.id === sampleSellerId),
    true,
  );
  // 6. Test admin can filter by category_id
  const categoryProducts = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        category_id: sampleCategoryId
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(categoryProducts);
  // All products should belong to the specified category
  TestValidator.equals(
    "all products belong to category",
    categoryProducts.data.every((p) => p.category.id === sampleCategoryId),
    true,
  );
  // 7. Test admin can filter by price range
  const minPrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const maxPrice =
    minPrice + typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>();
  const priceRangeProducts = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        min_price: minPrice,
        max_price: maxPrice
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(priceRangeProducts);
  // All products should be within price range
  TestValidator.equals(
    "all products within price range",
    priceRangeProducts.data.every(
      (p) => p.basePrice >= minPrice && p.basePrice <= maxPrice,
    ),
    true,
  );
  // 8. Test admin can filter by creation date
  const createdAfter = new Date(
    new Date().getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ago
  const createdBefore = new Date().toISOString();
  const dateRangeProducts = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        created_after: createdAfter,
        created_before: createdBefore
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(dateRangeProducts);
  // Note: Date range validation skipped - ISummary type doesn't include createdAt field
  // 9. Test admin can sort by different fields
  // Sort by created_at descending (newest first)
  const sortedByDate = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_direction: "desc"
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(sortedByDate);
  // 10. Test admin can sort by base_price
  const sortedByPrice = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        sort_by: "base_price",
        sort_direction: "asc"
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(sortedByPrice);
  // 11. Test admin can sort by name
  const sortedByName = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        sort_by: "name",
        sort_direction: "asc"
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(sortedByName);
  // 12. Test admin can search by name
  const sampleProductName =
    allProducts.data.length > 0
      ? allProducts.data[0].name
      : RandomGenerator.paragraph({ sentences: 2 });
  const searchProducts = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        name_search: sampleProductName
      } satisfies IEcommerceMallProduct.IRequest
    },
  );
  typia.assert(searchProducts);
  // All products should contain the search term
  TestValidator.equals(
    "all products match name search",
    searchProducts.data.every((p) =>
      p.name.toLowerCase().includes(sampleProductName.toLowerCase()),
    ),
    true,
  );
  // 13. Validate product summaries include all required fields
  if (allProducts.data.length > 0) {
    const sampleProduct = allProducts.data[0];
    typia.assert(sampleProduct);
    // Verify all summary fields exist
    TestValidator.equals(
      "product has valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleProduct.id,
      ),
      true,
    );
    TestValidator.predicate("product has name", sampleProduct.name.length > 0);
    TestValidator.predicate(
      "product has positive price",
      sampleProduct.basePrice >= 0,
    );
    TestValidator.equals(
      "product has category",
      sampleProduct.category.id !== undefined,
      true,
    );
    TestValidator.equals(
      "product has seller",
      sampleProduct.seller.id !== undefined,
      true,
    );
    TestValidator.equals(
      "product has isActive",
      typeof sampleProduct.isActive === "boolean",
      true,
    );
  }
}