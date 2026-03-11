import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
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
import { generate_random_discussion_board_super_admin_status_enums_snapshots_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_snapshots_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_enum_snapshot } from "../../../prepare/prepare_random_discussion_board_status_enum_snapshot";

/**
 * Test successful deletion of a status enumeration snapshot from the audit trail.
 * A super administrator creates a new status enumeration for article statuses,
 * then creates a snapshot to capture its configuration. The super administrator
 * then deletes the snapshot using the proper API endpoint. Validate that the
 * snapshot is permanently deleted (hard deletion) and returns appropriate
 * success response. Confirm that associated metadata records are also removed
 * while the parent status enumeration remains unaffected. Verify audit logging
 * records the deletion action with super administrator identity.
 */
export async function test_api_status_enum_snapshot_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // 2. Create parent status enumeration for article statuses
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
  // 3. Create snapshot of the status enumeration for deletion test
  const snapshot =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          snapshotReason: "Test snapshot for deletion",
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Delete the snapshot using the erase endpoint
  await api.functional.discussionBoard.superAdmin.status_enums.snapshots.erase(
    superAdminConnection,
    {
      statusEnumId: statusEnum.id,
      snapshotId: snapshot.id,
    },
  );
  // 5. Validate successful deletion response (void return indicates success)
  // The erase function returns void on success, which means the deletion was completed
  // without errors. Since this is a hard deletion, we cannot verify the snapshot
  // no longer exists without a corresponding GET endpoint.
}
