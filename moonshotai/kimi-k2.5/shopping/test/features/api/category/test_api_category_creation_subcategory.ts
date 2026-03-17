import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test creating a subcategory under an existing parent category as an administrator.
 *
 * 1. Authenticate as admin via join
 * 2. Create a parent category (e.g., "Clothing")
 * 3. Create a subcategory by specifying the parent category's id (e.g., "Men's Clothing")
 * 4. Verify the created category has non-null parent reference, proper timestamps, and correct hierarchy
 */
export async function test_api_category_creation_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/admin/join" satisfies string as string,
      referrer: "https://test.com/admin" satisfies string as string,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: "All clothing items",
        } satisfies DeepPartial<IEcommerceMallCategory.ICreate>,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory with parent reference
  const subcategoryBody = {
    name: "Men's Clothing",
    description: "Clothing for men",
    parentId: parentCategory.id,
  } satisfies IEcommerceMallCategory.ICreate;
  const subcategory =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      { body: subcategoryBody },
    );
  typia.assert(subcategory);
  // 4. Validate subcategory structure
  TestValidator.equals(
    "subcategory name matches",
    subcategory.name,
    "Men's Clothing",
  );
  TestValidator.equals(
    "subcategory description matches",
    subcategory.description,
    "Clothing for men",
  );
  TestValidator.predicate(
    "subcategory has non-null parent",
    subcategory.parent !== null,
  );
  TestValidator.predicate(
    "subcategory parent id matches",
    subcategory.parent?.id === parentCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches",
    subcategory.parent?.name,
    parentCategory.name,
  );
  TestValidator.predicate(
    "subcategory has empty subcategories array",
    Array.isArray(subcategory.subcategories),
  );
  TestValidator.predicate(
    "subcategory has valid created_at",
    subcategory.created_at !== null,
  );
  TestValidator.predicate(
    "subcategory has valid updated_at",
    subcategory.updated_at !== null,
  );
  TestValidator.predicate(
    "subcategory deleted_at is null",
    subcategory.deleted_at === null,
  );
}
