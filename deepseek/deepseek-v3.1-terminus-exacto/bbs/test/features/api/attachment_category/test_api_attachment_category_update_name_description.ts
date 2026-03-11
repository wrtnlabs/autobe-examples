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

export async function test_api_attachment_category_update_name_description(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create initial attachment category
  const initialCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          order_index: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // Update category with new name and description
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardAttachmentCategory.IUpdate;
  const updatedCategory =
    await api.functional.discussionBoard.superAdmin.attachment_categories.update(
      superAdminConnection,
      {
        categoryId: initialCategory.id,
        body: updateData,
      },
    );
  typia.assert(updatedCategory);
  // Validate the update
  TestValidator.equals(
    "category ID remains the same",
    updatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "name is updated",
    updatedCategory.name,
    updateData.name,
  );
  TestValidator.equals(
    "description is updated",
    updatedCategory.description,
    updateData.description,
  );
  TestValidator.equals(
    "order index remains unchanged",
    updatedCategory.orderIndex,
    initialCategory.orderIndex,
  );
  TestValidator.equals(
    "active status remains unchanged",
    updatedCategory.isActive,
    initialCategory.isActive,
  );
  TestValidator.equals(
    "created at remains unchanged",
    updatedCategory.createdAt,
    initialCategory.createdAt,
  );
  TestValidator.predicate(
    "updated at timestamp is newer",
    updatedCategory.updatedAt > initialCategory.updatedAt,
  );
  TestValidator.equals(
    "deleted at remains null",
    updatedCategory.deletedAt,
    initialCategory.deletedAt,
  );
  // Handle parent comparison with proper null/undefined checking
  if (initialCategory.parent === null || initialCategory.parent === undefined) {
    TestValidator.equals(
      "parent remains null/undefined",
      updatedCategory.parent,
      initialCategory.parent,
    );
  } else {
    TestValidator.equals(
      "parent remains unchanged",
      updatedCategory.parent?.id,
      initialCategory.parent.id,
    );
  }
}
