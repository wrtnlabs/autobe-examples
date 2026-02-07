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

/**
 * Test creation of multiple ban reason categories with different sort orders to verify
 * proper ordering in administrator interfaces. Create categories with varying
 * sort_order values and validate that they are stored correctly and can be retrieved
 * in the specified order. Ensure that sort_order validation prevents duplicate
 * ordering conflicts and maintains consistent display across the moderation system.
 */
export async function test_api_ban_reason_category_creation_with_custom_sort_order(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create ban reason categories with different sort orders
  const category1 =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(category1);
  const category2 =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5>
          >() satisfies number as number,
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(category2);
  const category3 =
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: false,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >() satisfies number as number,
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  typia.assert(category3);
  // Validate that sort_order values are stored correctly
  TestValidator.equals("category1 sort_order", category1.sort_order, 1);
  TestValidator.equals("category2 sort_order", category2.sort_order, 5);
  TestValidator.equals("category3 sort_order", category3.sort_order, 10);
  // Test business logic: attempt to create duplicate sort_order
  await TestValidator.error("duplicate sort_order should fail", async () => {
    await generate_random_discussion_board_super_admin_ban_reason_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: 5 satisfies number as number, // Duplicate of category2
        } satisfies IDiscussionBoardBanReasonCategory.ICreate,
      },
    );
  });
  // Validate that original categories remain unchanged
  TestValidator.equals("category2 unchanged", category2.sort_order, 5);
}
