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

export async function test_api_status_enum_snapshot_version_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial status enumeration
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: "Initial draft status for articles",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Create first snapshot (v1.0-initial)
  const snapshot1 =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: "v1.0-initial",
          description: "Initial status enum configuration",
          snapshotReason: "Initial deployment",
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  // Validate first snapshot properties
  TestValidator.equals(
    "snapshot1 status enum reference",
    snapshot1.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "snapshot1 name",
    snapshot1.snapshot_name,
    "v1.0-initial",
  );
  TestValidator.equals(
    "snapshot1 description",
    snapshot1.description,
    "Initial status enum configuration",
  );
  TestValidator.equals(
    "snapshot1 reason",
    snapshot1.snapshot_reason,
    "Initial deployment",
  );
  // Create second snapshot (v1.1-update)
  const snapshot2 =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: "v1.1-update",
          description: "Updated with additional metadata",
          snapshotReason: "Configuration enhancement",
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  // Validate second snapshot properties
  TestValidator.equals(
    "snapshot2 status enum reference",
    snapshot2.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "snapshot2 name",
    snapshot2.snapshot_name,
    "v1.1-update",
  );
  TestValidator.equals(
    "snapshot2 description",
    snapshot2.description,
    "Updated with additional metadata",
  );
  TestValidator.equals(
    "snapshot2 reason",
    snapshot2.snapshot_reason,
    "Configuration enhancement",
  );
  // Create third snapshot (v2.0-major-change)
  const snapshot3 =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: "v2.0-major-change",
          description: "Major configuration overhaul",
          snapshotReason: "Platform migration",
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot3);
  // Validate third snapshot properties
  TestValidator.equals(
    "snapshot3 status enum reference",
    snapshot3.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "snapshot3 name",
    snapshot3.snapshot_name,
    "v2.0-major-change",
  );
  TestValidator.equals(
    "snapshot3 description",
    snapshot3.description,
    "Major configuration overhaul",
  );
  TestValidator.equals(
    "snapshot3 reason",
    snapshot3.snapshot_reason,
    "Platform migration",
  );
  // Validate timestamp sequence using ISO string comparison
  TestValidator.predicate(
    "snapshot1 created before snapshot2",
    snapshot1.created_at < snapshot2.created_at,
  );
  TestValidator.predicate(
    "snapshot2 created before snapshot3",
    snapshot2.created_at < snapshot3.created_at,
  );
  // Validate snapshot independence
  TestValidator.notEquals(
    "snapshot IDs are unique",
    snapshot1.id,
    snapshot2.id,
  );
  TestValidator.notEquals(
    "snapshot IDs are unique",
    snapshot1.id,
    snapshot3.id,
  );
  TestValidator.notEquals(
    "snapshot IDs are unique",
    snapshot2.id,
    snapshot3.id,
  );
  // Validate immutable properties remain consistent across snapshots
  TestValidator.equals(
    "status enum entity type consistency",
    snapshot1.statusEnum.entity_type,
    "article",
  );
  TestValidator.equals(
    "status enum value consistency",
    snapshot1.statusEnum.value,
    "draft",
  );
  TestValidator.equals(
    "status enum description consistency",
    snapshot1.statusEnum.description,
    "Initial draft status for articles",
  );
}
