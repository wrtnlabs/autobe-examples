import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
import { generate_random_discussion_board_super_admin_status_types_create } from "../../../generate/generate_random_discussion_board_super_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

/**
 * Test that updating a status type to violate the unique category+code constraint fails with appropriate error.
 * 1. Authenticate as superAdmin
 * 2. Create two different status types: first with category 'article', code 'published', and second with category 'comment', code 'pending'
 * 3. Attempt to update the second status type (comment/pending) to have same category and code as the first (article/published)
 * 4. Validate that the update fails with a 409 conflict error
 * 5. Test edge case where updating other fields but keeping same category+code combination should succeed
 */
export async function test_api_status_types_update_category_code_unique_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create two different status types
  const firstStatusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: "article",
          code: "published",
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(firstStatusType);
  const secondStatusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: "comment",
          code: "pending",
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(secondStatusType);
  // 3. Attempt to update second status type to violate unique constraint
  await TestValidator.error(
    "update should fail with unique constraint violation",
    async () => {
      await api.functional.discussionBoard.superAdmin.status_types.update(
        superAdminConnection,
        {
          statusTypeId: secondStatusType.id,
          body: {
            category: "article",
            code: "published",
          } satisfies IDiscussionBoardStatusType.IUpdate,
        },
      );
    },
  );
  // 4. Test edge case: update other fields but keep same category+code combination (should succeed)
  const updatedSecondStatusType =
    await api.functional.discussionBoard.superAdmin.status_types.update(
      superAdminConnection,
      {
        statusTypeId: secondStatusType.id,
        body: {
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  typia.assert(updatedSecondStatusType);
  // Validate that category and code remain unchanged
  TestValidator.equals(
    "category should remain unchanged",
    updatedSecondStatusType.category,
    "comment",
  );
  TestValidator.equals(
    "code should remain unchanged",
    updatedSecondStatusType.code,
    "pending",
  );
  // Validate that other fields were updated
  TestValidator.notEquals(
    "display_name should be updated",
    updatedSecondStatusType.display_name,
    secondStatusType.display_name,
  );
  TestValidator.notEquals(
    "description should be updated",
    updatedSecondStatusType.description,
    secondStatusType.description,
  );
  TestValidator.notEquals(
    "display_order should be updated",
    updatedSecondStatusType.display_order,
    secondStatusType.display_order,
  );
}
