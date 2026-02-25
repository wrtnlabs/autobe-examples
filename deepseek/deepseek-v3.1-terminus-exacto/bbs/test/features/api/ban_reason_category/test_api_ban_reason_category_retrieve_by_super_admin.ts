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

export async function test_api_ban_reason_category_retrieve_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
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
  // Create a ban reason category
  const createdCategory =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  // Retrieve the created category
  const retrievedCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.at(
      superAdminConnection,
      {
        categoryId: createdCategory.id,
      },
    );
  typia.assert(retrievedCategory);
  // Validate all fields match
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "category is_active matches",
    retrievedCategory.is_active,
    createdCategory.is_active,
  );
  TestValidator.equals(
    "category sort_order matches",
    retrievedCategory.sort_order,
    createdCategory.sort_order,
  );
  TestValidator.equals(
    "category created_at matches",
    retrievedCategory.created_at,
    createdCategory.created_at,
  );
  TestValidator.equals(
    "category updated_at matches",
    retrievedCategory.updated_at,
    createdCategory.updated_at,
  );
}
