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

export async function test_api_attachment_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Create top-level attachment category
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    parent_id: null,
    order_index: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
  } satisfies IDiscussionBoardAttachmentCategory.ICreate;
  const createdCategory =
    await api.functional.discussionBoard.superAdmin.attachment_categories.create(
      superAdminConnection,
      { body: categoryBody },
    );
  typia.assert(createdCategory);
  // Validate business logic - category matches input and has correct structure
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryBody.description,
  );
  TestValidator.equals(
    "order index matches input",
    createdCategory.orderIndex,
    categoryBody.order_index,
  );
  TestValidator.equals(
    "active status matches input",
    createdCategory.isActive,
    categoryBody.is_active,
  );
  TestValidator.equals(
    "parent is null for top-level category",
    createdCategory.parent,
    null,
  );
}
