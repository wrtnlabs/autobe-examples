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
 * Test successful retrieval of a status enumeration snapshot by a super administrator.
 * 1. Authenticate as superAdmin using join
 * 2. Create a status enumeration for snapshot parent
 * 3. Create a snapshot of the status enumeration
 * 4. Retrieve the specific snapshot and validate metadata
 */
export async function test_api_status_enum_snapshot_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create status enumeration
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create snapshot of the status enumeration
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
  // 4. Retrieve the specific snapshot
  const retrievedSnapshot =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.at(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate snapshot metadata
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot name matches",
    retrievedSnapshot.snapshot_name,
    snapshot.snapshot_name,
  );
  TestValidator.equals(
    "description matches",
    retrievedSnapshot.description,
    snapshot.description,
  );
  TestValidator.equals(
    "snapshot reason matches",
    retrievedSnapshot.snapshot_reason,
    snapshot.snapshot_reason,
  );
  TestValidator.predicate(
    "has creation timestamp",
    retrievedSnapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    retrievedSnapshot.updated_at !== undefined,
  );
  // 6. Validate parent status enum relationship
  TestValidator.equals(
    "parent status enum ID matches",
    retrievedSnapshot.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "parent entity type matches",
    retrievedSnapshot.statusEnum.entity_type,
    statusEnum.entity_type,
  );
  TestValidator.equals(
    "parent value matches",
    retrievedSnapshot.statusEnum.value,
    statusEnum.value,
  );
  TestValidator.equals(
    "parent description matches",
    retrievedSnapshot.statusEnum.description,
    statusEnum.description,
  );
  TestValidator.equals(
    "parent sort order matches",
    retrievedSnapshot.statusEnum.sort_order,
    statusEnum.sort_order,
  );
}