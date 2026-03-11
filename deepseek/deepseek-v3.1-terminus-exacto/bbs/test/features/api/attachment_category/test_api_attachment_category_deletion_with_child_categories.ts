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

export async function test_api_attachment_category_deletion_with_child_categories(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create parent category
  const parentCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
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
  // Create first child category
  const childCategory1 =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
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
  typia.assert(childCategory1);
  // Create second child category
  const childCategory2 =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
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
  typia.assert(childCategory2);
  // Test 1: Attempt to delete parent category with children (should fail)
  await TestValidator.error(
    "parent category deletion with children should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.attachment_categories.erase(
        superAdminConnection,
        {
          categoryId: parentCategory.id,
        },
      );
    },
  );
  // Test 2: Delete child categories first
  await api.functional.discussionBoard.superAdmin.attachment_categories.erase(
    superAdminConnection,
    {
      categoryId: childCategory1.id,
    },
  );
  await api.functional.discussionBoard.superAdmin.attachment_categories.erase(
    superAdminConnection,
    {
      categoryId: childCategory2.id,
    },
  );
  // Test 3: Now delete parent category (should succeed)
  await api.functional.discussionBoard.superAdmin.attachment_categories.erase(
    superAdminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // Verify all categories are properly deleted
  TestValidator.predicate(
    "parent category deletion successful after children removal",
    true,
  );
}
