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
 * Test that an administrator can successfully create an audit trail snapshot for an existing status enumeration.
 * Verifies that the snapshot captures the current state of the status enum including entity_type, value,
 * description, sort_order, and is_active status. Validates that the snapshot includes proper references
 * to the parent status enum and contains all required metadata.
 */
export async function test_api_status_enum_audit_snapshot_creation(
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
  // 2. Create a status enumeration as prerequisite
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
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
  // 3. Create snapshot for the status enumeration
  const snapshotInput = {
    snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    snapshotReason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate;
  const snapshot =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot references parent status enum correctly
  TestValidator.equals(
    "status enum id matches",
    snapshot.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "status enum entity_type matches",
    snapshot.statusEnum.entity_type,
    statusEnum.entity_type,
  );
  TestValidator.equals(
    "status enum value matches",
    snapshot.statusEnum.value,
    statusEnum.value,
  );
  TestValidator.equals(
    "status enum description matches",
    snapshot.statusEnum.description,
    statusEnum.description,
  );
  TestValidator.equals(
    "status enum sort_order matches",
    snapshot.statusEnum.sort_order,
    statusEnum.sort_order,
  );
  TestValidator.equals(
    "status enum is_active matches",
    snapshot.statusEnum.is_active,
    statusEnum.is_active,
  );
  // 5. Validate snapshot metadata matches creation input
  TestValidator.equals(
    "snapshot name matches input",
    snapshot.snapshot_name,
    snapshotInput.snapshotName,
  );
  TestValidator.equals(
    "snapshot description matches input",
    snapshot.description,
    snapshotInput.description,
  );
  TestValidator.equals(
    "snapshot reason matches input",
    snapshot.snapshot_reason,
    snapshotInput.snapshotReason,
  );
  // 6. Validate timestamps are properly set
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(snapshot.created_at) <= new Date(snapshot.updated_at),
  );
  TestValidator.equals(
    "snapshot deleted_at is null",
    snapshot.deleted_at,
    null,
  );
}
