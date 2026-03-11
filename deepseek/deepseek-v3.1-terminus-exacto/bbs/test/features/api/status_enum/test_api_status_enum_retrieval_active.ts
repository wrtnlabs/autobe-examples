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
 * Test the successful retrieval of an active status enumeration by ID.
 * 1. Authenticate as an administrator using admin join utility.
 * 2. Create a new active status enumeration using generation utility.
 * 3. Extract the created statusEnumId from the response.
 * 4. Call the target GET endpoint with the valid statusEnumId.
 * 5. Validate the response contains complete status enum details.
 * 6. Verify all expected fields are present including timestamps.
 */
export async function test_api_status_enum_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new active status enumeration
  const entityType = RandomGenerator.pick([
    "article",
    "comment",
    "admin_request",
    "user",
    "ban",
    "attachment",
  ] as const);
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: entityType,
          value: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 1,
            wordMax: 3,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Extract statusEnumId
  const statusEnumId = statusEnum.id;
  // 4. Call GET endpoint to retrieve the status enumeration
  const retrieved = await api.functional.discussionBoard.admin.status_enums.at(
    adminConnection,
    { statusEnumId: statusEnumId },
  );
  typia.assert(retrieved);
  // 5. Validate response structure and business logic
  TestValidator.equals("ID matches requested", retrieved.id, statusEnumId);
  TestValidator.equals(
    "entity_type matches",
    retrieved.entity_type,
    entityType,
  );
  TestValidator.equals("value matches", retrieved.value, statusEnum.value);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    statusEnum.description,
  );
  TestValidator.equals(
    "sort_order matches",
    retrieved.sort_order,
    statusEnum.sort_order,
  );
  TestValidator.predicate(
    "is_active should be true",
    retrieved.is_active === true,
  );
  TestValidator.predicate(
    "created_at should be present",
    retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be present",
    retrieved.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null for active enum",
    retrieved.deleted_at,
    null,
  );
}
