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

export async function test_api_ban_reason_category_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial ban reason category
  const initialCategory =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // Update only name and description fields
  const updatedCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.update(
      superAdminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanReasonCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // Validate that updated fields changed
  TestValidator.notEquals(
    "name should be updated",
    initialCategory.name,
    updatedCategory.name,
  );
  TestValidator.notEquals(
    "description should be updated",
    initialCategory.description,
    updatedCategory.description,
  );
  // Validate that unchanged fields remain the same
  TestValidator.equals(
    "is_active should remain unchanged",
    initialCategory.is_active,
    updatedCategory.is_active,
  );
  TestValidator.equals(
    "sort_order should remain unchanged",
    initialCategory.sort_order,
    updatedCategory.sort_order,
  );
  // Validate that system-managed fields are properly set
  TestValidator.predicate(
    "id should remain the same",
    initialCategory.id === updatedCategory.id,
  );
  TestValidator.predicate(
    "created_at should remain the same",
    initialCategory.created_at === updatedCategory.created_at,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedCategory.updated_at) > new Date(initialCategory.updated_at),
  );
  TestValidator.equals(
    "deleted_at should remain null",
    initialCategory.deleted_at,
    updatedCategory.deleted_at,
  );
}
