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
 * Test that the system prevents creation of duplicate status enumeration values within the same entity type.
 * 1. Authenticate as administrator
 * 2. Create initial status value for comment entities
 * 3. Attempt to create duplicate status value with same entity_type and value
 * 4. Verify duplicate creation is rejected with error
 * 5. Validate uniqueness constraint allows same value across different entity types
 */
export async function test_api_status_enum_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial status value for comment entities
  const initialStatus =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "comment",
          value: "pending",
          description: "Comment is awaiting moderation",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(initialStatus);
  // 3. Attempt to create duplicate status value with same entity_type and value
  await TestValidator.error(
    "duplicate status enum creation should fail",
    async () => {
      await generate_random_discussion_board_admin_status_enums_create(
        adminConnection,
        {
          body: {
            entity_type: "comment",
            value: "pending",
            description: "Another pending status for comments",
            sort_order: 2,
          } satisfies IDiscussionBoardStatusEnum.ICreate,
        },
      );
    },
  );
  // 4. Validate uniqueness constraint allows same value across different entity types
  const crossEntityStatus =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "pending",
          description: "Article is awaiting approval",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(crossEntityStatus);
  // 5. Verify the cross-entity status was created successfully
  TestValidator.equals(
    "cross-entity status should have different entity_type",
    crossEntityStatus.entity_type,
    "article",
  );
  TestValidator.equals(
    "cross-entity status should have same value",
    crossEntityStatus.value,
    "pending",
  );
  TestValidator.notEquals(
    "cross-entity status should have different ID",
    crossEntityStatus.id,
    initialStatus.id,
  );
}
