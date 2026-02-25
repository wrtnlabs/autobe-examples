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

export async function test_api_ban_reason_category_update_successful_modification(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
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
  // Create initial ban reason category
  const initialCategory =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // Prepare update data with all fields modified
  const updateData: IDiscussionBoardBanReasonCategory.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: false,
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<101> & tags.Maximum<200>
    >(),
  };
  // Execute update
  const updatedCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.update(
      superAdminConnection,
      {
        categoryId: initialCategory.id,
        body: updateData,
      },
    );
  typia.assert(updatedCategory);
  // Validate updated fields
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
    "is_active should be updated",
    updatedCategory.is_active,
    updateData.is_active,
  );
  TestValidator.equals(
    "sort_order should be updated",
    updatedCategory.sort_order,
    updateData.sort_order,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at should remain unchanged",
    updatedCategory.created_at === initialCategory.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be newer",
    updatedCategory.updated_at,
    initialCategory.updated_at,
  );
  TestValidator.predicate(
    "id should remain unchanged",
    updatedCategory.id === initialCategory.id,
  );
}
