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
 * Test that the system prevents creation of duplicate status enumeration values
 * within the same entity_type category. This validates the unique constraint
 * enforcement for status enum creation.
 */
export async function test_api_status_enum_creation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Define test data with fixed entity_type and value
  const entityType = "article" as const;
  const statusValue = "draft" as const;
  const createBody = {
    entity_type: entityType,
    value: statusValue,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardStatusEnum.ICreate;
  // 3. Create initial status enum using utility function
  const firstStatusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(firstStatusEnum);
  // 4. Verify initial creation succeeded
  TestValidator.equals(
    "entity_type matches",
    firstStatusEnum.entity_type,
    entityType,
  );
  TestValidator.equals("value matches", firstStatusEnum.value, statusValue);
  // 5. Attempt duplicate creation with identical entity_type and value using utility function
  await TestValidator.error(
    "duplicate status enum creation should fail",
    async () => {
      await generate_random_discussion_board_super_admin_status_enums_create(
        superAdminConnection,
        { body: createBody },
      );
    },
  );
}
