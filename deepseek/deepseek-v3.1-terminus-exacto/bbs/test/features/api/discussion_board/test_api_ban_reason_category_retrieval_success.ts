import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_reason_category_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Retrieve ban reason category
  const category =
    await api.functional.discussionBoard.admin.ban_reason_categories.at(
      adminConnection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(category);
  // Validate business logic - category should be active for successful retrieval
  TestValidator.predicate("category is active", category.is_active === true);
  // Validate that category has meaningful content
  TestValidator.predicate(
    "category name is not empty",
    category.name.trim().length > 0,
  );
  TestValidator.predicate(
    "category description is not empty",
    category.description.trim().length > 0,
  );
  TestValidator.predicate("sort order is positive", category.sort_order > 0);
  // Validate timestamps are in correct order
  TestValidator.predicate(
    "created_at is before updated_at",
    new Date(category.created_at) <= new Date(category.updated_at),
  );
  // Validate that deleted_at is null for active category
  TestValidator.equals(
    "deleted_at is null for active category",
    category.deleted_at,
    null,
  );
}
