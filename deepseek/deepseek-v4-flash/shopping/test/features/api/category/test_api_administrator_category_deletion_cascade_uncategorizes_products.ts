import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test administrator category deletion cascade behavior: deleting a top-level
 * category soft-deletes its subcategories while preserving parent-child references.
 *
 * Validates the cascade soft-delete behavior of the category deletion endpoint.
 * When an administrator deletes a top-level category, all subcategories under
 * it must also be soft-deleted server-side. Since no GET endpoint or product
 * APIs are available for direct verification, the test uses an indirect approach:
 * attempting to delete an already-soft-deleted category returns 404, confirming
 * the cascade took effect.
 *
 * 1. Administrator joins the platform to obtain authentication tokens.
 * 2. Administrator creates a top-level category (e.g., "Electronics").
 * 3. Administrator creates a subcategory referencing the top-level category as parent.
 * 4. Administrator deletes the top-level category (cascade soft-deletes subcategory).
 * 5. Re-attempting deletion of the parent category returns 404 (already soft-deleted).
 * 6. Re-attempting deletion of the subcategory also returns 404 (cascade soft-delete confirmed).
 */
export async function test_api_administrator_category_deletion_cascade_uncategorizes_products(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a top-level category
  const parentCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  // Step 3: Create a subcategory under the top-level category
  const subCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  // Step 4: Delete the top-level category (cascade should soft-delete subcategory)
  await api.functional.eCommerceMall.administrator.categories.erase(
    adminConnection,
    { categoryId: parentCategory.id },
  );
  // Step 5: Verify parent category is soft-deleted (attempting deletion again returns 404)
  await TestValidator.httpError(
    "deleting already soft-deleted parent returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.categories.erase(
        adminConnection,
        { categoryId: parentCategory.id },
      );
    },
  );
  // Step 6: Verify subcategory is also cascade-soft-deleted (attempting deletion returns 404)
  await TestValidator.httpError(
    "deleting cascade-soft-deleted subcategory returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.categories.erase(
        adminConnection,
        { categoryId: subCategory.id },
      );
    },
  );
}
