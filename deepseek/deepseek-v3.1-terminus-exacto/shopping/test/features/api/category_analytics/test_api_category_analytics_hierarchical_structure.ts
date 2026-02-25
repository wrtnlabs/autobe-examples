import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { generate_random_ecommerce_administrator_seller_approval_responses_create } from "../../../generate/generate_random_ecommerce_administrator_seller_approval_responses_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_seller_approval_response } from "../../../prepare/prepare_random_ecommerce_seller_approval_response";

export async function test_api_category_analytics_hierarchical_structure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Step 2: Create administrator account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Step 3: Create hierarchical category structure (3 top-level categories with 3 subcategories each)
  const topLevelCategories: IEcommerceCategory[] = [];
  const subcategories: IEcommerceCategory[] = [];
  // Create 3 top-level categories
  for (let i = 0; i < 3; i++) {
    const topCategory =
      await generate_random_ecommerce_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: `TopCategory${i + 1}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceCategory.ICreate,
        },
      );
    topLevelCategories.push(topCategory);
    // Create 3 subcategories for each top-level category
    for (let j = 1; j <= 3; j++) {
      const subCategory =
        await generate_random_ecommerce_administrator_categories_create(
          adminConnection,
          {
            body: {
              name: `SubCategory${i + 1}-${j}`,
              description: RandomGenerator.paragraph({ sentences: 1 }),
              parent_category_id: topCategory.id,
            } as any,
          },
        );
      subcategories.push(subCategory);
    }
  }
  // Step 4: Create seller account, get approval, and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Wait for seller approval
  const approvalResponse =
    await generate_random_ecommerce_administrator_seller_approval_responses_create(
      adminConnection,
      {
        body: {
          seller_approval_queue_id: "waiting for approval creation placeholder",
          decision: "approved" as const,
          reason: null,
        } satisfies IEcommerceSellerApprovalResponse.ICreate,
      },
    );
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceSeller.ILogin,
  });
  // Step 5: Create products distributed across category hierarchy
  const products: IEcommerceProduct[] = [];
  // Create products in top-level categories only
  for (const topCategory of topLevelCategories) {
    const product = await generate_random_ecommerce_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product ${topCategory.name}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<number & tags.Type<"uint32">>(),
          category_id: topCategory.id,
        } satisfies IEcommerceProduct.ICreate,
      },
    );
    products.push(product);
  }
  // Create products in subcategories (to test aggregation)
  for (const subCategory of subcategories) {
    const product = await generate_random_ecommerce_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product ${subCategory.name}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<number & tags.Type<"uint32">>(),
          category_id: subCategory.id,
        } satisfies IEcommerceProduct.ICreate,
      },
    );
    products.push(product);
  }
  // Create orphaned subcategories (no products - to test zero count)
  const emptyCategory =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "EmptyCategory",
          description: "Category with no products",
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  // Step 6: Call category usage analytics endpoint as super administrator
  const analyticsResponse: any =
    await api.functional.ecommerce.superAdministrator.category_usage.at(
      superAdminConnection,
    );
  // Step 7: Validate statistics
  typia.assert(analyticsResponse);
  // Validate hierarchical structure is maintained
  TestValidator.equals(
    "category hierarchy should maintain parent-child relationships",
    analyticsResponse.parent_category_id,
    null,
  );
  // Validate product counts per category using API response structure
  for (const category of analyticsResponse.categories || []) {
    const expectedCount = products.filter(
      (product) => (product as any).category === category.id,
    ).length;
    TestValidator.equals(
      `category ${category.name} should have correct product count`,
      category.products_count,
      expectedCount,
    );
  }
  // Verify parent category aggregation includes child category products
  const parentCategoryCount = products.filter((product) =>
    topLevelCategories.some((cat) => cat.id === (product as any).category),
  ).length;
  const childCategoryCount = products.filter((product) =>
    subcategories.some((cat) => cat.id === (product as any).category),
  ).length;
  const totalExpectedCount = parentCategoryCount + childCategoryCount;
  TestValidator.equals(
    "total product count should aggregate parent and child categories",
    analyticsResponse.total_products,
    totalExpectedCount,
  );
}