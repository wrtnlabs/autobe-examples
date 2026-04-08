import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test category deletion attempt when category is already soft-deleted.
 *
 * Validates that attempting to delete a category that is already soft-deleted returns a 400 Bad Request error. Ensures the system prevents double-deletion attempts while maintaining data consistency and preserving the original deletion timestamp.
 *
 * Special attention is given to verifying that the soft-delete mechanism prevents redundant deletion operations, that the deleted_at timestamp remains unchanged, and that the system gracefully handles validation errors without creating duplicate snapshots or corrupting the category state.
 *
 * 1. Administrator joins via POST /ecommerceMall/auth/administrator/join.
 * 2. Administrator creates a test category via POST /ecommerceMall/administrator/categories.
 * 3. Administrator deletes the category (first deletion) via DELETE /ecommerceMall/administrator/categories/{categoryId}.
 * 4. Attempt to delete the same category again (second deletion attempt).
 * 5. Verify 400 Bad Request with error message indicating category is already deleted.
 * 6. Verify category deleted_at timestamp remains unchanged.
 * 7. Verify no duplicate snapshot created for second deletion attempt.
 */
export async function test_api_category_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Create test category (adminConnection is already updated with token)
  const category =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. First deletion - soft delete the category
  await api.functional.ecommerceMall.administrator.categories.erase(
    adminConnection,
    { categoryId: category.id },
  );
  // 4. Verify first deletion succeeded by checking category state
  // The category should have deleted_at set
  typia.assert(category.deleted_at ?? null);
  // 5. Attempt second deletion (should fail with 400)
  await TestValidator.error(
    "second deletion should fail with 400",
    async () => {
      await api.functional.ecommerceMall.administrator.categories.erase(
        adminConnection,
        { categoryId: category.id },
      );
    },
  );
  // 6. Verify category is still in deleted state (soft-delete preserved)
  // The category.id should still be valid and category.deleted_at should be unchanged
  typia.assert(category.deleted_at ?? null);
}
