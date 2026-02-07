import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
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

export async function test_api_ban_reason_category_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create ban reason category with valid data
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardBanReasonCategory.ICreate;
  const category =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(category);
  // Validate response structure
  TestValidator.equals(
    "category name matches input",
    category.name,
    createBody.name,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    createBody.description,
  );
  TestValidator.equals(
    "category is_active matches input",
    category.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "category sort_order matches input",
    category.sort_order,
    createBody.sort_order,
  );
  // Validate soft deletion tracking
  TestValidator.equals(
    "category deleted_at is null for active category",
    category.deleted_at,
    null,
  );
}
