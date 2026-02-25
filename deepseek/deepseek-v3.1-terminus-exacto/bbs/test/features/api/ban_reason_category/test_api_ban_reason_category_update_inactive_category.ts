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

export async function test_api_ban_reason_category_update_inactive_category(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
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
  // Create initial active ban reason category
  const initialCategory =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  TestValidator.equals(
    "category initially active",
    initialCategory.is_active,
    true,
  );
  // Deactivate the category
  const deactivatedCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.update(
      superAdminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardBanReasonCategory.IUpdate,
      },
    );
  typia.assert(deactivatedCategory);
  TestValidator.equals(
    "category deactivated",
    deactivatedCategory.is_active,
    false,
  );
  TestValidator.equals(
    "id remains same",
    deactivatedCategory.id,
    initialCategory.id,
  );
  // Reactivate with new name (simulate category reactivation workflow)
  const newName = RandomGenerator.name(2);
  const reactivatedCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.update(
      superAdminConnection,
      {
        categoryId: deactivatedCategory.id,
        body: {
          name: newName,
          is_active: true,
        } satisfies IDiscussionBoardBanReasonCategory.IUpdate,
      },
    );
  typia.assert(reactivatedCategory);
  // Validate reactivation and new properties
  TestValidator.equals(
    "category reactivated",
    reactivatedCategory.is_active,
    true,
  );
  TestValidator.equals("name updated", reactivatedCategory.name, newName);
  TestValidator.equals(
    "id preserved",
    reactivatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "description preserved",
    reactivatedCategory.description,
    initialCategory.description,
  );
  TestValidator.equals(
    "sort order preserved",
    reactivatedCategory.sort_order,
    initialCategory.sort_order,
  );
  // Verify category transitions correctly
  TestValidator.predicate(
    "category becomes available again",
    reactivatedCategory.is_active === true,
  );
}
