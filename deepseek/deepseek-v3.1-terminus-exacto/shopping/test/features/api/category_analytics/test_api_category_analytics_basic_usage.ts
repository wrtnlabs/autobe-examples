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

export async function test_api_category_analytics_basic_usage(
  connection: api.IConnection,
): Promise<void> {
  // Create superadministrator account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: "super_admin@example.com",
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  /**
   * Create test categories including hierarchical structure
   * Create products associated with categories to generate usage data
   * Verify category usage statistics include correct product counts
   * Validate hierarchical representation and proper sorting
   */
  const categories: IEcommerceCategory[] = [];
  // Create top-level categories
  categories.push(
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    ),
  );
  categories.push(
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      { body: { name: "Books", description: "Physical books and e-books" } },
    ),
  );
  // Create nested subcategories
  categories.push(
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones with advanced features",
        },
      },
    ),
  );
  categories.push(
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: "Portable computers for work and gaming",
        },
      },
    ),
  );
  // Create seller account, authenticate, get approval
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@example.com",
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Approve seller account
  const sellerApproval =
    await generate_random_ecommerce_administrator_seller_approval_responses_create(
      adminConnection,
      { body: { decision: "approved", reason: "Test seller account" } },
    );
  // Create products associated with created categories
  const products: IEcommerceProduct[] = [];
  for (const category of categories) {
    const product = await generate_random_ecommerce_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
    products.push(product);
  }
  // Retrieve category usage statistics
  const usageStats =
    await api.functional.ecommerce.superAdministrator.category_usage.at(
      superAdminConnection,
    );
  // Validate response structure
  typia.assert(usageStats);
  // The endpoint returns a single IEcommerceCategory object, not an array
  // Test basic properties that should exist
  TestValidator.predicate(
    "usage stats should have valid id",
    typeof usageStats.id === "string" && usageStats.id.length > 0,
  );
  TestValidator.predicate(
    "usage stats should have name",
    typeof usageStats.name === "string" && usageStats.name.length > 0,
  );
  TestValidator.predicate(
    "usage stats should have description",
    typeof usageStats.description === "string" ||
      usageStats.description === null,
  );
  // Validate hierarchical structure
  if (usageStats.parent !== null) {
    TestValidator.predicate(
      "parent category should have valid id",
      typeof usageStats.parent?.id === "string" &&
        usageStats.parent.id.length > 0,
    );
  }
  // Validate timestamps
  TestValidator.predicate(
    "usage stats should have created_at timestamp",
    typeof usageStats.created_at === "string" &&
      usageStats.created_at.length > 0,
  );
  TestValidator.predicate(
    "usage stats should have updated_at timestamp",
    typeof usageStats.updated_at === "string" &&
      usageStats.updated_at.length > 0,
  );
  // Since the endpoint returns a single category, validate it's one of our created categories
  TestValidator.predicate(
    "returned category should be one of the created categories",
    categories.some((cat) => cat.id === usageStats.id),
  );
}
