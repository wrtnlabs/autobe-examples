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

export async function test_api_ban_reason_category_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://discussion-board.local/admin",
      referrer: "https://discussion-board.local",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create first ban reason category with unique name
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const firstCategory =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  // Step 3: Attempt to create duplicate category with same name
  await TestValidator.error(
    "should reject category with duplicate name",
    async () => {
      await generate_random_discussion_board_super_admin_ban_reason_categories_create(
        superAdminConnection,
        {
          body: {
            name: categoryName, // Duplicate name
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_active: true,
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IDiscussionBoardBanReasonCategory.ICreate,
        },
      );
    },
  );
  // Step 4: Additional validation - ensure active categories constraint
  TestValidator.equals(
    "category name should remain unique",
    firstCategory.name,
    categoryName,
  );
}
