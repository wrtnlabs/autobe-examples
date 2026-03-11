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

export async function test_api_status_enum_snapshot_update_clarify_audit_context(
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
          value: "draft",
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
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          snapshotReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Update the snapshot metadata with enhanced audit context
  const updatedSnapshot =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.update(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        snapshotId: snapshot.id,
        body: {
          ...snapshot,
          description:
            "Enhanced description for compliance audit trail - capturing status enumeration state at system update milestone",
          snapshot_reason:
            "Updated to provide better context for regulatory compliance review and audit trail clarity",
        } satisfies IDiscussionBoardStatusEnumSnapshot,
      },
    );
  typia.assert(updatedSnapshot);
  // 5. Validate that core snapshot data is preserved
  TestValidator.equals(
    "snapshot ID unchanged",
    updatedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "status enum reference unchanged",
    updatedSnapshot.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedSnapshot.created_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "snapshot_name unchanged",
    updatedSnapshot.snapshot_name,
    snapshot.snapshot_name,
  );
  // 6. Validate that metadata fields are updated
  TestValidator.notEquals(
    "description updated",
    updatedSnapshot.description,
    snapshot.description,
  );
  TestValidator.notEquals(
    "snapshot_reason updated",
    updatedSnapshot.snapshot_reason,
    snapshot.snapshot_reason,
  );
  // 7. Validate referential integrity
  TestValidator.equals(
    "parent status enum entity_type",
    updatedSnapshot.statusEnum.entity_type,
    statusEnum.entity_type,
  );
  TestValidator.equals(
    "parent status enum value",
    updatedSnapshot.statusEnum.value,
    statusEnum.value,
  );
  TestValidator.equals(
    "parent status enum description",
    updatedSnapshot.statusEnum.description,
    statusEnum.description,
  );
  // 8. Validate that updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedSnapshot.updated_at,
    snapshot.updated_at,
  );
}
