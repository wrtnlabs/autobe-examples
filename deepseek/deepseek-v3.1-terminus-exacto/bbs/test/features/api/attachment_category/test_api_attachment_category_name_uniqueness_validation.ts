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

/**
 * Test attachment category name uniqueness validation within the same parent hierarchy.
 *
 * 1. Create admin connection and authenticate using admin join
 * 2. Create a parent category for hierarchical testing
 * 3. Create two child categories under the same parent with unique names
 * 4. Attempt to update child A's name to match child B's name - should fail with error
 * 5. Validate that updates maintaining uniqueness succeed (rename child A to new unique name)
 * 6. Test edge cases: case-insensitive matching, whitespace normalization
 */
export async function test_api_attachment_category_name_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create parent category
  const parentCategory =
    await api.functional.discussionBoard.admin.attachment_categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create two child categories with unique names under same parent
  const childNameA = `Child ${RandomGenerator.alphabets(8)}`;
  const childNameB = `Child ${RandomGenerator.alphabets(8)}`;
  const childCategoryA =
    await api.functional.discussionBoard.admin.attachment_categories.create(
      adminConnection,
      {
        body: {
          name: childNameA,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: parentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategoryA);
  TestValidator.equals("child A name matches", childCategoryA.name, childNameA);
  TestValidator.equals(
    "child A parent matches",
    childCategoryA.parent?.id,
    parentCategory.id,
  );
  const childCategoryB =
    await api.functional.discussionBoard.admin.attachment_categories.create(
      adminConnection,
      {
        body: {
          name: childNameB,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: parentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategoryB);
  TestValidator.equals("child B name matches", childCategoryB.name, childNameB);
  TestValidator.equals(
    "child B parent matches",
    childCategoryB.parent?.id,
    parentCategory.id,
  );
  // 4. Attempt to update child A's name to match child B's name - should fail
  await TestValidator.error("duplicate name within same parent", async () => {
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: childCategoryA.id,
        body: {
          name: childNameB,
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  });
  // Verify child A name remains unchanged after failed update
  const refreshedChildA =
    await api.functional.discussionBoard.admin.attachment_categories.create(
      adminConnection,
      {
        body: {
          name: childNameA,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: parentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(refreshedChildA);
  TestValidator.equals(
    "child A name unchanged after duplicate attempt",
    refreshedChildA.name,
    childNameA,
  );
  // 5. Update child A to a new unique name - should succeed
  const newUniqueName = `Unique ${RandomGenerator.alphabets(10)}`;
  const updatedChildA =
    await api.functional.discussionBoard.admin.attachment_categories.update(
      adminConnection,
      {
        categoryId: childCategoryA.id,
        body: {
          name: newUniqueName,
        } satisfies IDiscussionBoardAttachmentCategory.IUpdate,
      },
    );
  typia.assert(updatedChildA);
  TestValidator.equals(
    "child A updated to new unique name",
    updatedChildA.name,
    newUniqueName,
  );
  // 6. Test edge cases
  // 6.1 Case-insensitive matching test
  const caseSensitiveName = `Test${RandomGenerator.alphabets(5)}`;
  await api.functional.discussionBoard.admin.attachment_categories.create(
    adminConnection,
    {
      body: {
        name: caseSensitiveName,
        description: "Original case",
        parent_id: parentCategory.id,
        order_index: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
      } satisfies IDiscussionBoardAttachmentCategory.ICreate,
    },
  );
  await TestValidator.error("case-insensitive duplicate check", async () => {
    await api.functional.discussionBoard.admin.attachment_categories.create(
      adminConnection,
      {
        body: {
          name: caseSensitiveName.toLowerCase(),
          description: "Different case",
          parent_id: parentCategory.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  });
  // 6.2 Whitespace normalization test
  const nameWithSpaces = `  ${RandomGenerator.alphabets(6)}  `;
  const trimmedName = nameWithSpaces.trim();
  await api.functional.discussionBoard.admin.attachment_categories.create(
    adminConnection,
    {
      body: {
        name: trimmedName,
        description: "Trimmed name",
        parent_id: parentCategory.id,
        order_index: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
      } satisfies IDiscussionBoardAttachmentCategory.ICreate,
    },
  );
  await TestValidator.error(
    "whitespace normalized duplicate check",
    async () => {
      await api.functional.discussionBoard.admin.attachment_categories.create(
        adminConnection,
        {
          body: {
            name: nameWithSpaces,
            description: "Name with spaces",
            parent_id: parentCategory.id,
            order_index: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            is_active: true,
          } satisfies IDiscussionBoardAttachmentCategory.ICreate,
        },
      );
    },
  );
  // 7. Test that names can be duplicated across different parent hierarchies
  const anotherParent =
    await api.functional.discussionBoard.admin.attachment_categories.create(
      adminConnection,
      {
        body: {
          name: `Another Parent ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(anotherParent);
  // Should succeed - same name but different parent
  const sameNameDifferentParent =
    await api.functional.discussionBoard.admin.attachment_categories.create(
      adminConnection,
      {
        body: {
          name: childNameB, // Same as child B but different parent
          description: "Different parent, same name",
          parent_id: anotherParent.id,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(sameNameDifferentParent);
  TestValidator.equals(
    "same name allowed under different parent",
    sameNameDifferentParent.name,
    childNameB,
  );
  TestValidator.equals(
    "parent is different",
    sameNameDifferentParent.parent?.id,
    anotherParent.id,
  );
}
