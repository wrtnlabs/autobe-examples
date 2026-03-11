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

export async function test_api_status_enum_update_deactivation_deprecated_value(
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
  // 2. Create an active status enum
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Validate initial status enum is active
  TestValidator.predicate(
    "initial status enum is active",
    statusEnum.is_active === true,
  );
  // Store original timestamps for comparison
  const originalCreatedAt = statusEnum.created_at;
  const originalUpdatedAt = statusEnum.updated_at;
  // 3. Deactivate the status enum
  const updatedStatusEnum =
    await api.functional.discussionBoard.superAdmin.status_enums.update(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardStatusEnum.IUpdate,
      },
    );
  typia.assert(updatedStatusEnum);
  // 4. Validate deactivation
  TestValidator.equals(
    "status enum ID remains consistent",
    updatedStatusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedStatusEnum.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedStatusEnum.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "status enum is deactivated",
    updatedStatusEnum.is_active === false,
  );
  // Validate updated_at is actually newer
  const originalUpdatedDate = new Date(originalUpdatedAt);
  const updatedDate = new Date(updatedStatusEnum.updated_at);
  TestValidator.predicate(
    "updated_at timestamp is newer",
    updatedDate > originalUpdatedDate,
  );
  // 5. Validate other properties remain unchanged
  TestValidator.equals(
    "entity_type unchanged",
    updatedStatusEnum.entity_type,
    statusEnum.entity_type,
  );
  TestValidator.equals(
    "value unchanged",
    updatedStatusEnum.value,
    statusEnum.value,
  );
  TestValidator.equals(
    "description unchanged",
    updatedStatusEnum.description,
    statusEnum.description,
  );
  TestValidator.equals(
    "sort_order unchanged",
    updatedStatusEnum.sort_order,
    statusEnum.sort_order,
  );
}
