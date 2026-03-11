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

export async function test_api_status_enum_snapshot_retrieval_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status enumeration with comprehensive descriptive metadata
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "published",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create a snapshot with full audit metadata including reason
  const snapshotCreateBody: IDiscussionBoardStatusEnumSnapshot.ICreate = {
    snapshotName: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    snapshotReason: "compliance audit Q3 2026",
  };
  const snapshot =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        body: snapshotCreateBody,
        params: {
          statusEnumId: statusEnum.id,
        },
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot and validate all metadata fields
  const retrievedSnapshot =
    await api.functional.discussionBoard.admin.status_enums.snapshots.at(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validate snapshot metadata preservation with null-safe checks
  TestValidator.equals(
    "snapshot name matches",
    retrievedSnapshot.snapshot_name,
    snapshotCreateBody.snapshotName,
  );
  // Handle nullable description field
  if (
    snapshotCreateBody.description !== null &&
    snapshotCreateBody.description !== undefined
  ) {
    TestValidator.equals(
      "snapshot description matches",
      retrievedSnapshot.description,
      snapshotCreateBody.description,
    );
  } else {
    TestValidator.equals(
      "snapshot description should be null/undefined",
      retrievedSnapshot.description,
      snapshotCreateBody.description,
    );
  }
  // Handle nullable snapshot_reason field
  if (
    snapshotCreateBody.snapshotReason !== null &&
    snapshotCreateBody.snapshotReason !== undefined
  ) {
    TestValidator.equals(
      "snapshot reason matches",
      retrievedSnapshot.snapshot_reason,
      snapshotCreateBody.snapshotReason,
    );
  } else {
    TestValidator.equals(
      "snapshot reason should be null/undefined",
      retrievedSnapshot.snapshot_reason,
      snapshotCreateBody.snapshotReason,
    );
  }
  // Validate timestamp logic
  TestValidator.predicate("created_at is before or equal to updated_at", () => {
    const createdAt = new Date(retrievedSnapshot.created_at);
    const updatedAt = new Date(retrievedSnapshot.updated_at);
    return createdAt <= updatedAt;
  });
  TestValidator.equals(
    "deleted_at is null for active snapshot",
    retrievedSnapshot.deleted_at,
    null,
  );
  // Validate parent status enumeration relationship
  TestValidator.equals(
    "statusEnum ID matches",
    retrievedSnapshot.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "statusEnum entity_type matches",
    retrievedSnapshot.statusEnum.entity_type,
    statusEnum.entity_type,
  );
  TestValidator.equals(
    "statusEnum value matches",
    retrievedSnapshot.statusEnum.value,
    statusEnum.value,
  );
  TestValidator.equals(
    "statusEnum description matches",
    retrievedSnapshot.statusEnum.description,
    statusEnum.description,
  );
  TestValidator.equals(
    "statusEnum sort_order matches",
    retrievedSnapshot.statusEnum.sort_order,
    statusEnum.sort_order,
  );
  TestValidator.predicate(
    "statusEnum is_active is boolean",
    typeof retrievedSnapshot.statusEnum.is_active === "boolean",
  );
}
