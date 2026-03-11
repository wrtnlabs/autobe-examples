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
 * Test idempotency of status type deletion operation.
 * 1. Create a super administrator connection
 * 2. Create a status type for testing
 * 3. Delete the status type successfully
 * 4. Attempt to delete the same status type again
 * 5. Verify idempotency - same successful result without side effects
 */
export async function test_api_status_type_deletion_idempotent(
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
  // 2. Create a status type for idempotency test
  const statusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: RandomGenerator.alphabets(8),
          code: RandomGenerator.alphabets(6),
          display_name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // 3. First deletion - should succeed
  await api.functional.discussionBoard.superAdmin.status_types.erase(
    superAdminConnection,
    {
      statusTypeId: statusType.id,
    },
  );
  // 4. Second deletion - should also succeed (idempotent)
  await api.functional.discussionBoard.superAdmin.status_types.erase(
    superAdminConnection,
    {
      statusTypeId: statusType.id,
    },
  );
  // 5. Third deletion - should still succeed (idempotent)
  await api.functional.discussionBoard.superAdmin.status_types.erase(
    superAdminConnection,
    {
      statusTypeId: statusType.id,
    },
  );
  // The test passes if no errors are thrown - idempotency verified
}
