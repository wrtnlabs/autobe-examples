import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
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
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

/**
 * Test partial update of a status enumeration value.
 * Create a status enum with entity_type 'comment', value 'pending', description 'Comment awaiting moderation', sort_order 10, and is_active true.
 * Then perform a partial update modifying only the description field to 'Comment awaiting approval' and sort_order to 5.
 * Verify that only the specified fields are updated while other fields retain their original values.
 * Check that the response reflects the partial changes correctly and maintains data integrity for unchanged fields.
 */
export async function test_api_status_enum_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status enum with specific values
  const createBody = {
    entity_type: "comment",
    value: "pending",
    description: "Comment awaiting moderation",
    sort_order: 10,
  } satisfies IDiscussionBoardStatusEnum.ICreate;
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: createBody,
      },
    );
  typia.assert(statusEnum);
  // 3. Verify initial values
  TestValidator.equals(
    "initial entity_type",
    statusEnum.entity_type,
    "comment",
  );
  TestValidator.equals("initial value", statusEnum.value, "pending");
  TestValidator.equals(
    "initial description",
    statusEnum.description,
    "Comment awaiting moderation",
  );
  TestValidator.equals("initial sort_order", statusEnum.sort_order, 10);
  TestValidator.predicate("initial is_active true", statusEnum.is_active);
  // 4. Perform partial update modifying only description and sort_order
  const updateResult =
    await api.functional.discussionBoard.admin.status_enums.update(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          description: "Comment awaiting approval",
          sort_order: 5,
        } satisfies IDiscussionBoardStatusEnum.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 5. Verify partial update: only specified fields changed
  TestValidator.equals(
    "entity_type unchanged",
    updateResult.entity_type,
    "comment",
  );
  TestValidator.equals("value unchanged", updateResult.value, "pending");
  TestValidator.equals(
    "description updated",
    updateResult.description,
    "Comment awaiting approval",
  );
  TestValidator.equals("sort_order updated", updateResult.sort_order, 5);
  TestValidator.predicate("is_active unchanged (true)", updateResult.is_active);
  // 6. Verify data integrity: IDs match
  TestValidator.equals("ID unchanged", updateResult.id, statusEnum.id);
  // 7. Verify timestamps were updated (updated_at should change)
  TestValidator.notEquals(
    "updated_at changed",
    updateResult.updated_at,
    statusEnum.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updateResult.created_at,
    statusEnum.created_at,
  );
}
