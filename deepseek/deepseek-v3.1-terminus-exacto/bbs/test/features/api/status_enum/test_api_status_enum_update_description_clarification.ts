import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
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
import { generate_random_discussion_board_super_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

/**
 * Test updating a status enumeration description to improve clarity for administrators.
 * A superAdmin authenticates, creates a status enum for article workflow, then updates
 * the description field to provide more detailed context about when this status should be used.
 * Validate that only the description field is updated while other fields remain unchanged,
 * and verify the updated timestamp reflects the modification.
 */
export async function test_api_status_enum_update_description_clarification(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial status enum for article workflow
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(8),
          description: "Initial description",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Store original values for comparison
  const original = {
    id: statusEnum.id,
    entity_type: statusEnum.entity_type,
    value: statusEnum.value,
    sort_order: statusEnum.sort_order,
    is_active: statusEnum.is_active,
    created_at: statusEnum.created_at,
    updated_at: statusEnum.updated_at,
  };
  // 4. Update only the description field with improved clarity
  const improvedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updated =
    await api.functional.discussionBoard.superAdmin.status_enums.update(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          description: improvedDescription,
        } satisfies IDiscussionBoardStatusEnum.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Validate only description changed, other fields identical
  TestValidator.equals("ID unchanged", updated.id, original.id);
  TestValidator.equals(
    "entity_type unchanged",
    updated.entity_type,
    original.entity_type,
  );
  TestValidator.equals("value unchanged", updated.value, original.value);
  TestValidator.equals(
    "sort_order unchanged",
    updated.sort_order,
    original.sort_order,
  );
  TestValidator.equals(
    "is_active unchanged",
    updated.is_active,
    original.is_active,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    original.created_at,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    improvedDescription,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    original.updated_at,
  );
  // 6. Verify updated_at is newer (later timestamp)
  const originalDate = new Date(original.updated_at);
  const updatedDate = new Date(updated.updated_at);
  TestValidator.predicate("updated_at is newer", updatedDate > originalDate);
}
