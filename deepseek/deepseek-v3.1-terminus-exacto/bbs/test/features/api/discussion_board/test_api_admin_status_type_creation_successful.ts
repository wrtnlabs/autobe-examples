import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { generate_random_discussion_board_admin_status_types_create } from "../../../generate/generate_random_discussion_board_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

/**
 * Test creating a new status type with all required and optional fields provided.
 * Verify successful creation: response includes generated UUID, timestamps, and matches provided data.
 * Validate that the status type is immediately active and can be used across the system.
 */
export async function test_api_admin_status_type_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate random status type creation data
  const createData: IDiscussionBoardStatusType.ICreate = {
    category: RandomGenerator.alphabets(8),
    code: RandomGenerator.alphabets(6),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardStatusType.ICreate;
  // 3. Create status type
  const statusType =
    await generate_random_discussion_board_admin_status_types_create(
      adminConnection,
      {
        body: createData,
      },
    );
  // 4. Validate response structure
  typia.assert(statusType);
  // 5. Verify all provided data matches response
  TestValidator.equals(
    "category matches",
    statusType.category,
    createData.category,
  );
  TestValidator.equals("code matches", statusType.code, createData.code);
  TestValidator.equals(
    "display_name matches",
    statusType.display_name,
    createData.display_name,
  );
  TestValidator.equals(
    "description matches",
    statusType.description,
    createData.description,
  );
  TestValidator.equals(
    "display_order matches",
    statusType.display_order,
    createData.display_order ?? 0,
  );
  TestValidator.equals(
    "is_active matches",
    statusType.is_active,
    createData.is_active ?? true,
  );
  // 6. Check system-generated fields
  TestValidator.predicate(
    "deleted_at is null for active status type",
    statusType.deleted_at === null,
  );
}
