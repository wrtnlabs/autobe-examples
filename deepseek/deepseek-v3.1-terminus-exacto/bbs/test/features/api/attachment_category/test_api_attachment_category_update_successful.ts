import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_admin_attachment_categories_create";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";

export async function test_api_attachment_category_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create initial attachment category
  const initialCategory =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // Prepare update data
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order_index: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: false,
  } satisfies IDiscussionBoardAttachmentCategory.IUpdate;
  // Update the attachment category
  const updatedCategory =
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: updateData,
      },
    );
  typia.assert(updatedCategory);
  // Validate that the category was updated correctly
  TestValidator.equals(
    "category ID should remain the same",
    updatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "name should be updated",
    updatedCategory.name,
    updateData.name,
  );
  TestValidator.equals(
    "description should be updated",
    updatedCategory.description,
    updateData.description,
  );
  TestValidator.equals(
    "order index should be updated",
    updatedCategory.orderIndex,
    updateData.order_index,
  );
  TestValidator.equals(
    "isActive should be updated",
    updatedCategory.isActive,
    updateData.is_active,
  );
  // Validate that timestamps are properly set
  TestValidator.predicate(
    "createdAt should be preserved",
    updatedCategory.createdAt === initialCategory.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt should be different from initial updatedAt",
    updatedCategory.updatedAt,
    initialCategory.updatedAt,
  );
  // Validate that deletedAt remains null
  TestValidator.equals(
    "deletedAt should remain null",
    updatedCategory.deletedAt,
    null,
  );
  // Validate parent relationship is preserved
  TestValidator.equals(
    "parent should remain unchanged",
    updatedCategory.parent,
    initialCategory.parent,
  );
}
