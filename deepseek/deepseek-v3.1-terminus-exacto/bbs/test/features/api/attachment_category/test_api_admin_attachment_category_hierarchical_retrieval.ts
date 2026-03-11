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
 * Test retrieval of an attachment category with parent-child hierarchy.
 * Creates a parent category, then a child category that references the parent,
 * and validates that hierarchical relationships are correctly maintained.
 */
export async function test_api_admin_attachment_category_hierarchical_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
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
          parent_id: null,
          order_index: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create child attachment category referencing parent
  const childCategory =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: parentCategory.id,
          order_index: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  // 4. Retrieve the child category
  const retrievedChild =
    await api.functional.discussionBoard.admin.attachment_categories.at(
      adminConnection,
      {
        categoryId: childCategory.id,
      },
    );
  typia.assert(retrievedChild);
  // 5. Validate parent-child relationship
  TestValidator.equals(
    "child category ID matches",
    retrievedChild.id,
    childCategory.id,
  );
  TestValidator.predicate(
    "child has parent reference",
    retrievedChild.parent !== null,
  );
  if (retrievedChild.parent) {
    TestValidator.equals(
      "parent ID matches",
      retrievedChild.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "parent name matches",
      retrievedChild.parent.name,
      parentCategory.name,
    );
  }
}
