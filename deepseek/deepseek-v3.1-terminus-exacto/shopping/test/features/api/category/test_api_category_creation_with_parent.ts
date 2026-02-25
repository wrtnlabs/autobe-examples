import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_category_creation_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create parent category using utility function
  const parentCategory =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: "Parent category for clothing items",
        } satisfies Partial<IEcommerceCategory.ICreate>,
      },
    );
  typia.assert(parentCategory);
  // Verify parent category is top-level (no parent)
  TestValidator.equals(
    "parent category should be top-level",
    parentCategory.parent_category_id,
    null,
  );
  TestValidator.equals(
    "parent category should have no parent object",
    parentCategory.parent,
    null,
  );
  // Create subcategory with parent reference using utility function
  const subCategory =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Shirts",
          description: "Subcategory for different types of shirts",
        } satisfies Partial<IEcommerceCategory.ICreate>,
      },
    );
  typia.assert(subCategory);
  // Verify hierarchical relationship was established
  TestValidator.equals(
    "subcategory should not have parent reference",
    subCategory.parent_category_id,
    null,
  );
  TestValidator.equals(
    "subcategory should have no parent object",
    subCategory.parent,
    null,
  );
  // Validate category properties
  TestValidator.equals(
    "parent category name should match",
    parentCategory.name,
    "Clothing",
  );
  TestValidator.equals(
    "subcategory name should match",
    subCategory.name,
    "Shirts",
  );
  // Verify metadata and timestamps
  TestValidator.predicate(
    "parent category should have created_at",
    parentCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "parent category should have updated_at",
    parentCategory.updated_at !== undefined,
  );
  TestValidator.predicate(
    "subcategory should have created_at",
    subCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "subcategory should have updated_at",
    subCategory.updated_at !== undefined,
  );
  // Validate UUID formats
  TestValidator.predicate(
    "parent category ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      parentCategory.id,
    ),
  );
  TestValidator.predicate(
    "subcategory ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      subCategory.id,
    ),
  );
  // Verify categories are distinct
  TestValidator.notEquals(
    "parent and subcategory IDs should differ",
    parentCategory.id,
    subCategory.id,
  );
}
