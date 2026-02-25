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

export async function test_api_ban_reason_category_creation_success(
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
  // Prepare ban reason category creation data
  const createData = {
    name: `Category ${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
  } satisfies IDiscussionBoardBanReasonCategory.ICreate;
  // Create ban reason category
  const createdCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.create(
      superAdminConnection,
      { body: createData },
    );
  typia.assert(createdCategory);
  // Validate response contains all expected fields
  TestValidator.predicate(
    "category has valid ID",
    /^[0-9a-f-]{36}$/i.test(createdCategory.id),
  );
  TestValidator.equals(
    "name matches input",
    createdCategory.name,
    createData.name,
  );
  TestValidator.equals(
    "description matches input",
    createdCategory.description,
    createData.description,
  );
  TestValidator.equals(
    "is_active matches input",
    createdCategory.is_active,
    createData.is_active,
  );
  TestValidator.equals(
    "sort_order matches input",
    createdCategory.sort_order,
    createData.sort_order,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(Date.parse(createdCategory.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(Date.parse(createdCategory.updated_at)),
  );
  // Verify timestamps are reasonable (created_at should be within last minute)
  const createdAt = new Date(createdCategory.created_at);
  const currentTime = new Date();
  const timeDiff = currentTime.getTime() - createdAt.getTime();
  TestValidator.predicate("created_at is recent", timeDiff < 60000); // Within 1 minute
}
