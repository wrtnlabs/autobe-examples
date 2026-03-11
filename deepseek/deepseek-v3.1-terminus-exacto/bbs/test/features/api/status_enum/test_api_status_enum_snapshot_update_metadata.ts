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
 * Test updating metadata for an existing status enumeration snapshot.
 * 1. Authenticate as admin
 * 2. Create a status enumeration for articles with 'draft' status
 * 3. Create a snapshot of the status enumeration
 * 4. Update snapshot metadata (name, description, reason)
 * 5. Validate that only mutable fields are updated while core data remains unchanged
 * 6. Verify updated_at timestamp refresh and parent relationship integrity
 */
export async function test_api_status_enum_snapshot_update_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create status enumeration for articles with 'draft' status
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: "Article is in draft state",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create snapshot of the status enumeration
  const snapshot =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          snapshotReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // Store original values for comparison
  const originalName = snapshot.snapshot_name;
  const originalDescription = snapshot.description;
  const originalReason = snapshot.snapshot_reason;
  const originalCreatedAt = snapshot.created_at;
  const originalUpdatedAt = snapshot.updated_at;
  // 4. Update snapshot metadata
  const updatedSnapshot =
    await api.functional.discussionBoard.admin.status_enums.snapshots.update(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        snapshotId: snapshot.id,
        body: {
          snapshot_name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          snapshot_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardStatusEnumSnapshot.IUpdate,
      },
    );
  typia.assert(updatedSnapshot);
  // 5. Validate that only mutable fields are updated
  TestValidator.notEquals(
    "snapshot name should change",
    originalName,
    updatedSnapshot.snapshot_name,
  );
  TestValidator.notEquals(
    "snapshot description should change",
    originalDescription,
    updatedSnapshot.description,
  );
  TestValidator.notEquals(
    "snapshot reason should change",
    originalReason,
    updatedSnapshot.snapshot_reason,
  );
  // Validate that immutable fields remain unchanged
  TestValidator.equals(
    "status enum ID should remain unchanged",
    snapshot.statusEnum.id,
    updatedSnapshot.statusEnum.id,
  );
  TestValidator.equals(
    "status enum entity type should remain unchanged",
    snapshot.statusEnum.entity_type,
    updatedSnapshot.statusEnum.entity_type,
  );
  TestValidator.equals(
    "status enum value should remain unchanged",
    snapshot.statusEnum.value,
    updatedSnapshot.statusEnum.value,
  );
  TestValidator.equals(
    "status enum description should remain unchanged",
    snapshot.statusEnum.description,
    updatedSnapshot.statusEnum.description,
  );
  TestValidator.equals(
    "status enum sort order should remain unchanged",
    snapshot.statusEnum.sort_order,
    updatedSnapshot.statusEnum.sort_order,
  );
  TestValidator.equals(
    "status enum is_active should remain unchanged",
    snapshot.statusEnum.is_active,
    updatedSnapshot.statusEnum.is_active,
  );
  // 6. Verify updated_at timestamp refresh
  TestValidator.notEquals(
    "updated_at timestamp should be refreshed",
    originalUpdatedAt,
    updatedSnapshot.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    originalCreatedAt,
    updatedSnapshot.created_at,
  );
  // Validate parent status enum relationship integrity
  TestValidator.equals(
    "parent status enum ID should match",
    statusEnum.id,
    updatedSnapshot.statusEnum.id,
  );
  TestValidator.equals(
    "parent status enum entity type should match",
    statusEnum.entity_type,
    updatedSnapshot.statusEnum.entity_type,
  );
  TestValidator.equals(
    "parent status enum value should match",
    statusEnum.value,
    updatedSnapshot.statusEnum.value,
  );
}
