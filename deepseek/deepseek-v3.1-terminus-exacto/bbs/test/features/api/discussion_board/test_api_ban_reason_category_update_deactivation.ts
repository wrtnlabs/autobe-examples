import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_ban_reason_categories_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_reason_categories_create";
import { prepare_random_discussion_board_ban_reason_category } from "../../../prepare/prepare_random_discussion_board_ban_reason_category";

/**
 * Test deactivating a ban reason category while preserving historical associations.
 * 1. Create super admin connection
 * 2. Create active ban reason category
 * 3. Update category to inactive status
 * 4. Validate category is inactive but retains original properties
 * 5. Verify historical associations are preserved
 */
export async function test_api_ban_reason_category_update_deactivation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection using SDK function (utility function not available)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.Format<"password">>(),
          privilege_level: "super_admin",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // Update connection headers with authentication token
  superAdminConnection.headers = {
    Authorization: superAdminAuth.token.access,
  };
  // 2. Create active ban reason category using SDK function (utility function not available)
  const activeCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.create(
      superAdminConnection,
      {
        body: {
          name: "Test Ban Category",
          description: "Test category for deactivation",
          is_active: true,
          sort_order: 1,
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(activeCategory);
  // 3. Update category to inactive status
  const updatedCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.update(
      superAdminConnection,
      {
        categoryId: activeCategory.id,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardBanReasonCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate category is inactive but retains original properties
  TestValidator.equals(
    "category ID remains the same",
    updatedCategory.id,
    activeCategory.id,
  );
  TestValidator.equals(
    "name remains unchanged",
    updatedCategory.name,
    activeCategory.name,
  );
  TestValidator.equals(
    "description remains unchanged",
    updatedCategory.description,
    activeCategory.description,
  );
  TestValidator.equals(
    "sort order remains unchanged",
    updatedCategory.sort_order,
    activeCategory.sort_order,
  );
  TestValidator.predicate(
    "category is now inactive",
    updatedCategory.is_active === false,
  );
  TestValidator.predicate(
    "category was previously active",
    activeCategory.is_active === true,
  );
  // 5. Verify historical associations are preserved
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedCategory.created_at,
    activeCategory.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is updated",
    updatedCategory.updated_at !== activeCategory.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains null for soft delete",
    updatedCategory.deleted_at,
    null,
  );
}
