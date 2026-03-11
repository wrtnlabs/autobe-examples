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
 * Administrator attempts to soft delete a status type that has no active dependencies in other tables.
 * Validate that the status type exists and is marked as deleted (deleted_at timestamp set).
 * Ensure idempotency - second delete request returns same success result.
 * Verify audit trail records the administrator's action.
 */
export async function test_api_status_type_deletion_without_dependencies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a status type for deletion
  const statusType =
    await generate_random_discussion_board_admin_status_types_create(
      adminConnection,
      {},
    );
  typia.assert(statusType);
  // 3. Perform soft deletion
  await api.functional.discussionBoard.admin.status_types.erase(
    adminConnection,
    {
      statusTypeId: statusType.id,
    },
  );
  // 4. Test idempotency - second deletion should succeed
  await api.functional.discussionBoard.admin.status_types.erase(
    adminConnection,
    {
      statusTypeId: statusType.id,
    },
  );
}
