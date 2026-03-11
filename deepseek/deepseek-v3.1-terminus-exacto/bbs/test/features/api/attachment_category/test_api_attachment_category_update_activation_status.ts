import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
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
import { generate_random_discussion_board_super_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_super_admin_attachment_categories_create";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";

export async function test_api_attachment_category_update_activation_status(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create an active attachment category
  const categoryCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    order_index: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
  } satisfies IDiscussionBoardAttachmentCategory.ICreate;
  const category =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      { body: categoryCreateBody },
    );
  typia.assert(category);
  // Test deactivation: update category with is_active=false
  const deactivationUpdate = {
    is_active: false,
  } satisfies IDiscussionBoardAttachmentCategory.IUpdate;
  const deactivatedCategory =
    await api.functional.discussionBoard.superAdmin.attachment_categories.update(
      superAdminConnection,
      {
        categoryId: category.id,
        body: deactivationUpdate,
      },
    );
  typia.assert(deactivatedCategory);
  // Validate deactivation
  TestValidator.equals(
    "category ID unchanged",
    deactivatedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "name unchanged",
    deactivatedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "description unchanged",
    deactivatedCategory.description,
    category.description,
  );
  TestValidator.equals(
    "order index unchanged",
    deactivatedCategory.orderIndex,
    category.orderIndex,
  );
  TestValidator.equals(
    "is_active set to false",
    deactivatedCategory.isActive,
    false,
  );
  TestValidator.notEquals(
    "updatedAt changed after deactivation",
    deactivatedCategory.updatedAt,
    category.updatedAt,
  );
  // Test reactivation: update category with is_active=true
  const reactivationUpdate = {
    is_active: true,
  } satisfies IDiscussionBoardAttachmentCategory.IUpdate;
  const reactivatedCategory =
    await api.functional.discussionBoard.superAdmin.attachment_categories.update(
      superAdminConnection,
      {
        categoryId: category.id,
        body: reactivationUpdate,
      },
    );
  typia.assert(reactivatedCategory);
  // Validate reactivation
  TestValidator.equals(
    "category ID unchanged",
    reactivatedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "name unchanged",
    reactivatedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "description unchanged",
    reactivatedCategory.description,
    category.description,
  );
  TestValidator.equals(
    "order index unchanged",
    reactivatedCategory.orderIndex,
    category.orderIndex,
  );
  TestValidator.equals(
    "is_active set to true",
    reactivatedCategory.isActive,
    true,
  );
  TestValidator.notEquals(
    "updatedAt changed after reactivation",
    reactivatedCategory.updatedAt,
    deactivatedCategory.updatedAt,
  );
}
