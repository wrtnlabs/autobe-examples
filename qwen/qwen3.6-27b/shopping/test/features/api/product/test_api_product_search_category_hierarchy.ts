import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test product search by category includes parent category and all its direct subcategories (one-level nesting).
 *
 * Validates the category hierarchy search behavior where searching by a parent category ID returns products
 * assigned to that parent category as well as products assigned to any of its direct subcategories.
 * This tests the one-level nesting limit enforced by the category system.
 *
 * 1. Administrator logs in and creates a parent category (Electronics).
 * 2. Administrator creates a subcategory (Phones) linked to the parent Electronics category.
 * 3. Seller logs in and creates a product assigned to the parent category (Electronics).
 * 4. Seller creates a second product assigned to the subcategory (Phones).
 * 5. Customer logs in and searches products using the parent category ID (Electronics).
 * 6. Validates that search results include products from BOTH the parent category and the subcategory.
 * 7. Confirms the category summary in each product shows correct category assignment.
 */
export async function test_api_product_search_category_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Admin creates parent category (Electronics)
  const parentCategory =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Parent category for electronic devices",
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert<IEcommercePlatformCategory>(parentCategory);
  // 3. Admin creates subcategory (Phones) linked to parent Electronics category
  const subcategory =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Phones",
          description: "Subcategory for phones and mobile devices",
          parentEcommercePlatformCategoryId: parentCategory.id,
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert<IEcommercePlatformCategory>(subcategory);
  // 4. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 5. Seller creates product in parent category (Electronics)
  const productParent =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: parentCategory.id,
        },
      },
    );
  typia.assert<IEcommercePlatformProduct>(productParent);
  // 6. Seller creates product in subcategory (Phones)
  const productSubcategory =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: subcategory.id,
        },
      },
    );
  typia.assert<IEcommercePlatformProduct>(productSubcategory);
  // 7. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://test.com/customer",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 8. Customer searches products by parent category ID (Electronics)
  // This should return products from BOTH the parent category AND its direct subcategory
  const searchBody = {
    categoryId: parentCategory.id,
  } satisfies IEcommercePlatformProduct.ISearch;
  const searchResults = await api.functional.ecommercePlatform.customer.search(
    customerConnection,
    {
      body: searchBody,
    },
  );
  typia.assert<IPageIEcommercePlatformProduct.ISummary>(searchResults);
  // 9. Validate business logic - search results include products from parent category and subcategory
  const resultIds = searchResults.data.map((item) => item.id);
  TestValidator.predicate(
    "Search results include product from parent category",
    resultIds.includes(productParent.id),
  );
  TestValidator.predicate(
    "Search results include product from subcategory",
    resultIds.includes(productSubcategory.id),
  );
  TestValidator.predicate(
    "At least two products returned for category hierarchy search",
    searchResults.data.length >= 2,
  );
  // 10. Verify category summary in each product shows correct category assignment
  const parentProductResult = typia.assert<typeof searchResults.data[number]>(
    searchResults.data.find((item) => item.id === productParent.id)!,
  );
  const subcategoryProductResult = typia.assert<typeof searchResults.data[number]>(
    searchResults.data.find((item) => item.id === productSubcategory.id)!,
  );
  TestValidator.equals(
    "Product in parent category has correct category ID",
    parentProductResult.category.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "Product in subcategory has correct category ID",
    subcategoryProductResult.category.id,
    subcategory.id,
  );
  TestValidator.equals(
    "Subcategory product shows parent category reference",
    subcategoryProductResult.category.parent?.id,
    parentCategory.id,
  );
}