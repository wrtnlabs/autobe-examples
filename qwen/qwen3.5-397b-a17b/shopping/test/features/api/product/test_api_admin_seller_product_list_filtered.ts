import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test admin filtering and searching products by name, category, and price range.
 *
 * Validates the complete product filtering workflow including administrative seller approval, product creation with varied attributes, and comprehensive filter testing. Ensures that search, category, price range, and sorting filters work correctly both individually and in combination.
 *
 * The test creates multiple products with distinct characteristics to enable meaningful filter validation. Products vary in names (including 'Wireless' keyword for search testing), categories, and price points to test all filtering dimensions.
 *
 * 1. Administrator authenticates and approves a seller account.
 * 2. Seller creates multiple products with varied names, categories, and prices.
 * 3. Seller adds images and variants to all products for complete setup.
 * 4. Admin tests search filter with 'Wireless' keyword.
 * 5. Admin tests category filter with specific category UUID.
 * 6. Admin tests price range filter with minPrice and maxPrice.
 * 7. Admin tests sorting by price ascending.
 * 8. Admin tests combined filters (category + price range).
 */
export async function test_api_admin_seller_product_list_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
    sellerId: sellerId,
    body: {
      approval_status: "approved",
    } satisfies IShoppingMallSeller.IUpdate,
  });
  // 4. Seller login to create products
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Create multiple products with varied characteristics
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Wireless Mouse Pro",
        description: "High-precision wireless mouse with ergonomic design",
        base_price: 45,
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "USB Keyboard Mechanical",
        description: "Mechanical keyboard with RGB backlighting",
        base_price: 89,
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Wireless Keyboard Compact",
        description: "Compact wireless keyboard for travel",
        base_price: 55,
        shopping_mall_category_id: product1.category.id,
      },
    },
  );
  typia.assert(product3);
  const product4 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Laptop Stand Aluminum",
        description: "Adjustable aluminum laptop stand",
        base_price: 35,
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product4);
  const product5 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Wireless Charger Fast",
        description: "Fast wireless charging pad",
        base_price: 25,
        shopping_mall_category_id: product1.category.id,
      },
    },
  );
  typia.assert(product5);
  // 6. Add images to all products
  await generate_random_shopping_mall_seller_products_images_create(
    sellerLoginConnection,
    {
      params: { productId: product1.id },
      body: {
        url: typia.random<string & tags.Format<"uri">>(),
        display_order: 0,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerLoginConnection,
    {
      params: { productId: product2.id },
      body: {
        url: typia.random<string & tags.Format<"uri">>(),
        display_order: 0,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerLoginConnection,
    {
      params: { productId: product3.id },
      body: {
        url: typia.random<string & tags.Format<"uri">>(),
        display_order: 0,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerLoginConnection,
    {
      params: { productId: product4.id },
      body: {
        url: typia.random<string & tags.Format<"uri">>(),
        display_order: 0,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerLoginConnection,
    {
      params: { productId: product5.id },
      body: {
        url: typia.random<string & tags.Format<"uri">>(),
        display_order: 0,
      },
    },
  );
  // 7. Add variants to all products
  await generate_random_shopping_mall_seller_products_variants_create(
    sellerLoginConnection,
    {
      params: { productId: product1.id },
      body: {
        sku_code: "WM-001",
        option_values: "Color: Black",
        price: null,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_variants_create(
    sellerLoginConnection,
    {
      params: { productId: product2.id },
      body: {
        sku_code: "KB-001",
        option_values: "Switch: Blue",
        price: null,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_variants_create(
    sellerLoginConnection,
    {
      params: { productId: product3.id },
      body: {
        sku_code: "WK-001",
        option_values: "Color: White",
        price: null,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_variants_create(
    sellerLoginConnection,
    {
      params: { productId: product4.id },
      body: {
        sku_code: "LS-001",
        option_values: "Size: Standard",
        price: null,
      },
    },
  );
  await generate_random_shopping_mall_seller_products_variants_create(
    sellerLoginConnection,
    {
      params: { productId: product5.id },
      body: {
        sku_code: "WC-001",
        option_values: "Color: Black",
        price: null,
      },
    },
  );
  // 8. Test search filter - 'Wireless'
  const searchResult =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          search: "Wireless",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("search returns wireless products", () =>
    searchResult.data.every((p) => p.name.toLowerCase().includes("wireless")),
  );
  TestValidator.predicate(
    "search returns at least 3 products",
    () => searchResult.data.length >= 3,
  );
  // 9. Test category filter
  const categoryResult =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          categoryId: product1.category.id,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(categoryResult);
  TestValidator.predicate("category filter returns correct products", () =>
    categoryResult.data.every((p) => p.category.id === product1.category.id),
  );
  // 10. Test price range filter
  const priceResult =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          minPrice: 40,
          maxPrice: 60,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceResult);
  TestValidator.predicate("price range filter returns correct products", () =>
    priceResult.data.every((p) => p.base_price >= 40 && p.base_price <= 60),
  );
  // 11. Test sorting by price ascending
  const sortResult =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          sort: "price_asc",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(sortResult);
  TestValidator.predicate("price_asc sorting is correct", () => {
    for (let i = 1; i < sortResult.data.length; i++) {
      if (sortResult.data[i].base_price < sortResult.data[i - 1].base_price) {
        return false;
      }
    }
    return true;
  });
  // 12. Test combined filters (category + price range)
  const combinedResult =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          categoryId: product1.category.id,
          minPrice: 20,
          maxPrice: 60,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate("combined filters work correctly", () =>
    combinedResult.data.every(
      (p) =>
        p.category.id === product1.category.id &&
        p.base_price >= 20 &&
        p.base_price <= 60,
    ),
  );
  // 13. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data",
    () => searchResult.pagination.records >= searchResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    () => searchResult.pagination.pages >= 1,
  );
}
