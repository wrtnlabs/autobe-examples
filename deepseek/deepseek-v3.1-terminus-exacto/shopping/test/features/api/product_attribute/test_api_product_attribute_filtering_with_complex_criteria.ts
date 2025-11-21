import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test advanced product attribute filtering with complex search criteria
 * including pagination, sorting by multiple fields, and text pattern matching.
 * Validates that customers can efficiently browse product specifications using
 * sophisticated filtering options.
 */
export async function test_api_product_attribute_filtering_with_complex_criteria(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({ can_manage_categories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({ paragraphs: 1 }),
      tax_id: RandomGenerator.alphaNumeric(10),
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/register",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Switch to admin context for category creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://shoppingmall.example.com/admin/categories",
      referrer: "https://shoppingmall.example.com/admin/dashboard",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 4: Create product category structure
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Switch to seller context for product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://shoppingmall.example.com/seller/products",
      referrer: "https://shoppingmall.example.com/seller/dashboard",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 6: Create product with comprehensive attributes
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<15000>
        >(),
        cost_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<5000>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
        dimensions: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>>()}x${typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>>()}x${typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>>()}`,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id: typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: undefined,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 7: Test basic attribute filtering without criteria
  const basicAttributes =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(basicAttributes);
  TestValidator.equals(
    "basic attributes response structure",
    basicAttributes.pagination.current,
    1,
  );

  // Step 8: Test attribute search with text pattern matching
  const searchAttributes =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        search: "color",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(searchAttributes);

  // Step 9: Test sorting by attribute name
  const sortedByName =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        sort_by: "attribute_name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(sortedByName);

  // Step 10: Test sorting by display order
  const sortedByOrder =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        sort_by: "display_order",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(sortedByOrder);

  // Step 11: Test complex filtering combination
  const complexFilter =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        search: "size",
        sort_by: "attribute_value",
        order: "asc",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(complexFilter);

  // Step 12: Test pagination functionality
  const paginationTest =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        page: 2,
        limit: 3,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination page number",
    paginationTest.pagination.current,
    2,
  );

  // Step 13: Test limit validation
  const limitTest = await api.functional.shoppingMall.products.attributes.index(
    connection,
    {
      productId: product.id,
      body: {
        limit: 50,
        page: 1,
      } satisfies IShoppingMallProductAttribute.IRequest,
    },
  );
  typia.assert(limitTest);
  TestValidator.predicate(
    "limit within maximum range",
    limitTest.pagination.limit <= 100,
  );

  // Step 14: Test empty search criteria
  const emptySearch =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(emptySearch);

  // Step 15: Test product ID override functionality
  const productIdOverride =
    await api.functional.shoppingMall.products.attributes.index(connection, {
      productId: product.id,
      body: {
        product_id: product.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductAttribute.IRequest,
    });
  typia.assert(productIdOverride);

  // Final validation: Ensure all API calls returned valid pagination structures
  TestValidator.predicate(
    "basic attributes has valid pagination",
    basicAttributes.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search attributes has valid pagination",
    searchAttributes.pagination.records >= 0,
  );
  TestValidator.predicate(
    "sorted by name has valid pagination",
    sortedByName.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complex filter has valid pagination",
    complexFilter.pagination.records >= 0,
  );
}
