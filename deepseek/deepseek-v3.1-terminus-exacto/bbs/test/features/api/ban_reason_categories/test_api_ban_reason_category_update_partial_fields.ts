import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_super_admin_ban_reason_categories_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_reason_categories_create";
import { prepare_random_discussion_board_ban_reason_category } from "../../../prepare/prepare_random_discussion_board_ban_reason_category";

export async function test_api_ban_reason_category_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create initial ban reason category with complete field values
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardBanReasonCategory.ICreate;
  const initialCategory =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(initialCategory);
  // Store original values for later comparison
  const originalName = initialCategory.name;
  const originalSortOrder = initialCategory.sort_order;
  const originalCreatedAt = initialCategory.created_at;
  // Step 3: Update with only description and is_active fields
  const updateBody = {
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: false,
  } satisfies IDiscussionBoardBanReasonCategory.IUpdate;
  const updatedCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.update(
      superAdminConnection,
      {
        categoryId: initialCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // Validate partial updates
  TestValidator.equals(
    "description should be updated",
    updatedCategory.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_active should be updated",
    updatedCategory.is_active,
    updateBody.is_active,
  );
  // Validate unchanged fields
  TestValidator.equals(
    "name should remain unchanged",
    updatedCategory.name,
    originalName,
  );
  TestValidator.equals(
    "sort_order should remain unchanged",
    updatedCategory.sort_order,
    originalSortOrder,
  );
  // Validate timestamps
  TestValidator.equals(
    "created_at should not change",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should be newer",
    updatedCategory.updated_at,
    originalCreatedAt,
  );
  TestValidator.predicate("updated_at should be valid ISO string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
      updatedCategory.updated_at,
    ),
  );
}
