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

export async function test_api_attachment_category_update_hierarchical_organization(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a root category to be updated as child
  const rootCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(rootCategory);
  // Create a parent category for establishing hierarchical relationship
  const parentCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // Update the root category to become a child of the parent category
  const updatedCategory =
    await api.functional.discussionBoard.superAdmin.attachment_categories.update(
      superAdminConnection,
      {
        categoryId: rootCategory.id,
        body: {
          parent_id: parentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // Validate hierarchical relationship
  TestValidator.equals(
    "category ID remains the same",
    updatedCategory.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "parent ID is set correctly",
    updatedCategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    updatedCategory.parent?.name,
    parentCategory.name,
  );
  TestValidator.predicate(
    "category remains active",
    updatedCategory.isActive === true,
  );
  // Create another parent category to test moving between parents
  const anotherParentCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(anotherParentCategory);
  // Move the category to another parent
  const movedCategory =
    await api.functional.discussionBoard.superAdmin.attachment_categories.update(
      superAdminConnection,
      {
        categoryId: rootCategory.id,
        body: {
          parent_id: anotherParentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(movedCategory);
  // Validate the move
  TestValidator.equals(
    "category ID remains the same",
    movedCategory.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "new parent ID is set correctly",
    movedCategory.parent?.id,
    anotherParentCategory.id,
  );
  TestValidator.equals(
    "new parent name matches",
    movedCategory.parent?.name,
    anotherParentCategory.name,
  );
  // Test moving back to root level (null parent)
  const rootLevelCategory =
    await api.functional.discussionBoard.superAdmin.attachment_categories.update(
      superAdminConnection,
      {
        categoryId: rootCategory.id,
        body: {
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(rootLevelCategory);
  // Validate root level category
  TestValidator.equals(
    "category ID remains the same",
    rootLevelCategory.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "parent is null for root level",
    rootLevelCategory.parent,
    null,
  );
}
