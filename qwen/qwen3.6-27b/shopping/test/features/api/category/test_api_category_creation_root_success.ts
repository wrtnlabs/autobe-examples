import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";

/**
 * Test successful creation of a root category by an authenticated administrator.
 *
 * Validates the complete category creation workflow including administrator registration via join, category creation without a parent to establish a root category, and verification of the response structure.
 *
 * Special attention is given to verifying that root categories have a null parentCategory reference and an empty childrenCategories array, confirming the two-level hierarchy enforcement at creation time.
 *
 * 1. Administrator authenticates by joining the platform with randomized credentials.
 * 2. Administrator creates a new root category named "Electronics" with description "Consumer electronic devices".
 * 3. No parent category ID is provided to establish this as a root-level category.
 * 4. Response is type-validated and business-validated: name matches input, description matches input, parentCategory is null, and childrenCategories is empty.
 */
export async function test_api_category_creation_root_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create root category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Consumer electronic devices",
        },
      },
    );
  typia.assert(category);
  // 3. Validate response
  TestValidator.equals("name matches input", category.name, "Electronics");
  TestValidator.equals(
    "description matches input",
    category.description,
    "Consumer electronic devices",
  );
  TestValidator.equals(
    "parent is null for root category",
    category.parentCategory,
    null,
  );
  TestValidator.predicate(
    "has no children",
    category.childrenCategories.length === 0,
  );
}
