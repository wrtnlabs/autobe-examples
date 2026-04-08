import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test top-level category creation by an administrator.
 *
 * Validates the complete flow of creating a top-level category including
 * administrator authentication and category creation with all required fields.
 *
 * This test verifies that:
 * 1. An administrator can successfully authenticate using the join endpoint
 * 2. A top-level category can be created with name and description
 * 3. The response contains a system-generated UUID, provided name/description
 * 4. The parent field is null (confirming top-level category)
 * 5. System timestamps are automatically populated
 * 6. The subcategories_count is 0 and subcategories array is empty
 *
 * 1. Authenticate as administrator via POST /ecommerceMall/auth/admin/join
 * 2. Create top-level category via POST /ecommerceMall/admin/admin/categories
 * 3. Validate response contains correct data and structure
 */
export async function test_api_category_top_level_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create top-level category with name and description
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "TestElectronics",
          description: "Electronic devices and gadgets",
          parent_id: null,
        },
      },
    );
  // Step 3: Validate response using typia.assert for complete runtime validation
  typia.assert(category);
  // Validate specific business logic assertions
  TestValidator.equals(
    "category name matches",
    category.name,
    "TestElectronics",
  );
  TestValidator.equals(
    "description matches",
    category.description,
    "Electronic devices and gadgets",
  );
  TestValidator.equals("parent is null for top-level", category.parent, null);
  TestValidator.equals(
    "subcategories_count is 0",
    category.subcategories_count,
    0,
  );
  TestValidator.equals(
    "subcategories array is empty",
    category.subcategories.length,
    0,
  );
  TestValidator.equals("deleted_at is null", category.deleted_at, null);
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
}
