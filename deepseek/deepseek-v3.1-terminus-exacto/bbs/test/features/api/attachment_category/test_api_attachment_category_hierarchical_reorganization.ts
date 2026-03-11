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

export async function test_api_attachment_category_hierarchical_reorganization(
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
  // Create top-level categories
  const topLevelCategory1 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(topLevelCategory1);
  const topLevelCategory2 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(topLevelCategory2);
  // Create child categories under top-level categories
  const childCategory1 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: topLevelCategory1.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategory1);
  const childCategory2 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: topLevelCategory2.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategory2);
  // Test 1: Move child category to top-level (null parent)
  const updatedChildToTopLevel =
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: childCategory1.id,
        body: {
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(updatedChildToTopLevel);
  TestValidator.equals(
    "child category moved to top-level",
    updatedChildToTopLevel.parent,
    null,
  );
  // Test 2: Move top-level category to become child of another top-level category
  const updatedTopLevelToChild =
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: topLevelCategory1.id,
        body: {
          parent_id: topLevelCategory2.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(updatedTopLevelToChild);
  TestValidator.equals(
    "top-level category moved to child",
    updatedTopLevelToChild.parent?.id,
    topLevelCategory2.id,
  );
  // Test 3: Move child category between different parent hierarchies
  const updatedChildBetweenParents =
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: childCategory2.id,
        body: {
          parent_id: updatedTopLevelToChild.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(updatedChildBetweenParents);
  TestValidator.equals(
    "child category moved between parents",
    updatedChildBetweenParents.parent?.id,
    updatedTopLevelToChild.id,
  );
  // Test 4: Validate circular reference prevention
  await TestValidator.error(
    "circular reference should be prevented",
    async () => {
      await api.functional.discussionBoard.admin.attachment_categories.update(
        adminConnection,
        {
          categoryId: topLevelCategory2.id,
          body: {
            parent_id: updatedChildBetweenParents.id,
          } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
        },
      );
    },
  );
  // Test 5: Validate self-referencing prevention
  await TestValidator.error(
    "self-referencing should be prevented",
    async () => {
      await api.functional.discussionBoard.admin.attachment_categories.update(
        adminConnection,
        {
          categoryId: topLevelCategory2.id,
          body: {
            parent_id: topLevelCategory2.id,
          } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
        },
      );
    },
  );
  // Test 6: Validate order index maintenance
  const newOrderIndex = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const updatedWithNewOrder =
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: childCategory2.id,
        body: {
          order_index: newOrderIndex,
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(updatedWithNewOrder);
  TestValidator.equals(
    "order index maintained correctly",
    updatedWithNewOrder.orderIndex,
    newOrderIndex,
  );
  // Test 7: Validate hierarchical integrity after multiple updates
  const finalCategory =
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: updatedChildToTopLevel.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: false,
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(finalCategory);
  TestValidator.equals(
    "hierarchical integrity maintained",
    finalCategory.parent,
    null,
  );
  TestValidator.predicate(
    "category should be inactive",
    finalCategory.isActive === false,
  );
}
