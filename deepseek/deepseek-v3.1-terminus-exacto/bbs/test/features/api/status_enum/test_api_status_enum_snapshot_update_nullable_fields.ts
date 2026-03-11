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
 * Test updating snapshot metadata with nullable field handling.
 * As a super administrator, I need to update snapshot metadata where some fields
 * may be set to null values for optional information. The system should properly
 * handle nullable fields (description, snapshot_reason) by allowing them to be
 * updated to null values when optional metadata is not needed. Verify that
 * required fields like snapshot_name are properly validated and that the update
 * operation maintains data consistency across the status enumeration system.
 * Ensure that soft deletion tracking through deleted_at field remains properly
 * managed for audit trail preservation.
 */
export async function test_api_status_enum_snapshot_update_nullable_fields(
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
  // 2. Create a status enumeration entry
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
  // 3. Create a snapshot of the status enumeration
  const snapshot =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          snapshotReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Update the snapshot metadata with nullable fields set to null
  const updatedSnapshot =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.update(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        snapshotId: snapshot.id,
        body: {
          ...snapshot,
          snapshot_name: "Updated " + RandomGenerator.alphabets(8),
          description: null,
          snapshot_reason: null,
        } satisfies IDiscussionBoardStatusEnumSnapshot,
      },
    );
  typia.assert(updatedSnapshot);
  // 5. Validate business logic - nullable fields were properly updated
  TestValidator.equals(
    "description should be null",
    updatedSnapshot.description,
    null,
  );
  TestValidator.equals(
    "snapshot_reason should be null",
    updatedSnapshot.snapshot_reason,
    null,
  );
  TestValidator.notEquals(
    "snapshot_name should be updated",
    updatedSnapshot.snapshot_name,
    snapshot.snapshot_name,
  );
  TestValidator.equals(
    "statusEnum should remain the same",
    updatedSnapshot.statusEnum.id,
    statusEnum.id,
  );
}
