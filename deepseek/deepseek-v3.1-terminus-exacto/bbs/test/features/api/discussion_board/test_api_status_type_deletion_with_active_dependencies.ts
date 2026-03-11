import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_admin_status_enums_create";
import { generate_random_discussion_board_admin_status_types_create } from "../../../generate/generate_random_discussion_board_admin_status_types_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

/**
 * Test that system prevents deletion of a status type with active dependencies.
 *
 * 1. Authenticate as administrator
 * 2. Create a status type (e.g., category: "article", code: "draft")
 * 3. Create a status enumeration referencing that category (entity_type: "article")
 * 4. Attempt to delete the status type
 * 5. Validate deletion fails due to active dependency
 * 6. Confirm dependency validation logic works correctly
 */
export async function test_api_status_type_deletion_with_active_dependencies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status type
  const statusType =
    await generate_random_discussion_board_admin_status_types_create(
      adminConnection,
      {
        body: {
          category: "article",
          code: RandomGenerator.alphabets(8).toLowerCase(),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // 3. Create a status enumeration that references the status type category
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: statusType.category, // Reference the same category
          value: RandomGenerator.alphabets(6).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 4. Attempt to delete the status type with active dependency
  await TestValidator.error(
    "should prevent deletion with active dependencies",
    async () => {
      await api.functional.discussionBoard.admin.status_types.erase(
        adminConnection,
        {
          statusTypeId: statusType.id,
        },
      );
    },
  );
  // 5. Validate the status type still exists by attempting to create another status type with same category/code (should fail due to uniqueness)
  // This is an alternative verification that the original status type wasn't deleted
  await TestValidator.error(
    "status type should still exist preventing duplicate",
    async () => {
      await generate_random_discussion_board_admin_status_types_create(
        adminConnection,
        {
          body: {
            category: statusType.category,
            code: statusType.code, // Same category/code combination - should conflict
            display_name: RandomGenerator.paragraph({ sentences: 2 }),
            display_order: 2,
          } satisfies IDiscussionBoardStatusType.ICreate,
        },
      );
    },
  );
}
