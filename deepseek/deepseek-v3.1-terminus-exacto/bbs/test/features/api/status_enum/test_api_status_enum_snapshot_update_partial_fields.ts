import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
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
import { generate_random_discussion_board_admin_status_enums_snapshots_create } from "../../../generate/generate_random_discussion_board_admin_status_enums_snapshots_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_enum_snapshot } from "../../../prepare/prepare_random_discussion_board_status_enum_snapshot";

/**
 * Test partial field updates for status enumeration snapshot metadata.
 * Authenticate as admin, create a status enum for comments with status 'pending',
 * create a snapshot, then update only specific fields (e.g., update snapshot name
 * but leave description and reason unchanged). Validate that null values are
 * preserved correctly and that the update operation handles partial field updates
 * without affecting unmodified fields.
 */
export async function test_api_status_enum_snapshot_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status enumeration for comments with 'pending' status
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "comment",
          value: "pending",
          description: "Comment is awaiting moderation",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create a snapshot with initial metadata including null description and reason
  const initialSnapshot =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: RandomGenerator.name(2),
          description: null,
          snapshotReason: null,
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(initialSnapshot);
  // Verify initial state has null values
  TestValidator.equals(
    "initial description should be null",
    initialSnapshot.description,
    null,
  );
  TestValidator.equals(
    "initial reason should be null",
    initialSnapshot.snapshot_reason,
    null,
  );
  // 4. Update only the snapshot_name field while preserving null values
  const updatedSnapshotName = RandomGenerator.name(2);
  const updatedSnapshot =
    await api.functional.discussionBoard.admin.status_enums.snapshots.update(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        snapshotId: initialSnapshot.id,
        body: {
          snapshot_name: updatedSnapshotName,
          // Intentionally omit description and snapshot_reason to test partial update
        } satisfies IDiscussionBoardStatusEnumSnapshot.IUpdate,
      },
    );
  typia.assert(updatedSnapshot);
  // 5. Validate that only snapshot_name changed, description and reason remain null
  TestValidator.equals(
    "snapshot name should be updated",
    updatedSnapshot.snapshot_name,
    updatedSnapshotName,
  );
  TestValidator.equals(
    "description should remain null",
    updatedSnapshot.description,
    null,
  );
  TestValidator.equals(
    "snapshot reason should remain null",
    updatedSnapshot.snapshot_reason,
    null,
  );
  TestValidator.notEquals(
    "updated_at should change",
    updatedSnapshot.updated_at,
    initialSnapshot.updated_at,
  );
  // 6. Verify the status enum reference remains unchanged
  TestValidator.equals(
    "status enum id should remain same",
    updatedSnapshot.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "status enum entity type should remain same",
    updatedSnapshot.statusEnum.entity_type,
    "comment",
  );
  TestValidator.equals(
    "status enum value should remain same",
    updatedSnapshot.statusEnum.value,
    "pending",
  );
}
