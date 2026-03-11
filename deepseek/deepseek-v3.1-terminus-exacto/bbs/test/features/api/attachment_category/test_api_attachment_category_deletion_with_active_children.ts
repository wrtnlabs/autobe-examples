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

export async function test_api_attachment_category_deletion_with_active_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create parent attachment category
  const parentCategory =
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
  typia.assert(parentCategory);
  // 3. Create child attachment category referencing the parent
  const childCategory =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: parentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  // 4. Attempt to delete parent category (should fail)
  await TestValidator.error(
    "parent category deletion with active children should fail",
    async () => {
      await api.functional.discussionBoard.admin.attachment_categories.erase(
        adminConnection,
        {
          categoryId: parentCategory.id,
        },
      );
    },
  );
  // 5. Create another child category to verify parent category is still functional
  const additionalChildCategory =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: parentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(additionalChildCategory);
  // 6. Validate that the new child category correctly references the parent
  TestValidator.equals(
    "new child category should reference the original parent",
    additionalChildCategory.parent?.id,
    parentCategory.id,
  );
}
