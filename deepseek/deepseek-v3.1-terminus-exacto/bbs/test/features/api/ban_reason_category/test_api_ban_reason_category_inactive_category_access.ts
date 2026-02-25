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

export async function test_api_ban_reason_category_inactive_category_access(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using join utility
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create an inactive ban reason category
  const category =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: false,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(category);
  // Validate that the category is inactive
  TestValidator.equals("category is inactive", category.is_active, false);
  // Retrieve the inactive category
  const retrieved =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.at(
      superAdminConnection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(retrieved);
  // Validate that super admin can access inactive category
  TestValidator.equals("category ID matches", retrieved.id, category.id);
  TestValidator.equals("category name matches", retrieved.name, category.name);
  TestValidator.equals(
    "category description matches",
    retrieved.description,
    category.description,
  );
  TestValidator.equals(
    "category is_active matches",
    retrieved.is_active,
    false,
  );
  TestValidator.equals(
    "category sort_order matches",
    retrieved.sort_order,
    category.sort_order,
  );
  // Validate that other category details are preserved
  TestValidator.predicate("created_at is set", retrieved.created_at !== null);
  TestValidator.predicate("updated_at is set", retrieved.updated_at !== null);
}
