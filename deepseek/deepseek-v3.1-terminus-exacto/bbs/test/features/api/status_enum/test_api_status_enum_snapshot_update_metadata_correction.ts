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
 * Test updating snapshot metadata to correct administrative information.
 * As a super administrator, update snapshot name, description, and reason fields
 * when administrative metadata was incorrectly recorded or needs clarification
 * for audit trail purposes.
 */
export async function test_api_status_enum_snapshot_update_metadata_correction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a status enumeration
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
  // Verify status enumeration is active
  TestValidator.predicate(
    "status enumeration should be active",
    statusEnum.is_active,
  );
  // 3. Create a snapshot of the status enumeration
  const originalSnapshot =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        body: {
          snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          snapshotReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
        params: {
          statusEnumId: statusEnum.id,
        },
      },
    );
  typia.assert(originalSnapshot);
  // 4. Update the snapshot metadata with corrected information
  const updatePayload = {
    id: originalSnapshot.id,
    snapshot_name: "Corrected Snapshot Name - " + RandomGenerator.alphabets(5),
    description:
      "Updated description for audit trail clarification - " +
      RandomGenerator.paragraph({ sentences: 1 }),
    snapshot_reason:
      "Metadata correction - " + RandomGenerator.paragraph({ sentences: 1 }),
    created_at: originalSnapshot.created_at,
    updated_at: originalSnapshot.updated_at,
    deleted_at: originalSnapshot.deleted_at,
    statusEnum: originalSnapshot.statusEnum,
  } satisfies IDiscussionBoardStatusEnumSnapshot;
  const updatedSnapshot =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.update(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        snapshotId: originalSnapshot.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedSnapshot);
  // 5. Validate that mutable fields are updated
  TestValidator.equals(
    "snapshot name should be updated",
    updatedSnapshot.snapshot_name,
    updatePayload.snapshot_name,
  );
  TestValidator.equals(
    "description should be updated",
    updatedSnapshot.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "snapshot reason should be updated",
    updatedSnapshot.snapshot_reason,
    updatePayload.snapshot_reason,
  );
  // 6. Validate that immutable fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedSnapshot.id,
    originalSnapshot.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedSnapshot.created_at,
    originalSnapshot.created_at,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged",
    updatedSnapshot.deleted_at,
    originalSnapshot.deleted_at,
  );
  TestValidator.equals(
    "statusEnum should remain unchanged",
    updatedSnapshot.statusEnum.id,
    originalSnapshot.statusEnum.id,
  );
  // 7. Validate that updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedSnapshot.updated_at,
    originalSnapshot.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    new Date(updatedSnapshot.updated_at).getTime() > 0,
  );
  // 8. Verify the snapshot still belongs to the correct status enumeration
  TestValidator.equals(
    "snapshot should belong to correct status enum",
    updatedSnapshot.statusEnum.id,
    statusEnum.id,
  );
}
