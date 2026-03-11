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

export async function test_api_status_enum_compliance_snapshot_with_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status enum for article workflow
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "compliance_review",
          description: "Article status for compliance review process",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create first compliance snapshot with detailed metadata
  const snapshot1 =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: "Quarterly compliance audit Q1 2026",
          description:
            "Snapshot capturing status enum configuration for Q1 2026 compliance audit",
          snapshotReason: "Quarterly compliance audit Q1 2026",
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  // 4. Verify snapshot preserves status enum configuration
  TestValidator.equals(
    "snapshot status enum reference",
    snapshot1.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "status enum entity type preserved",
    snapshot1.statusEnum.entity_type,
    statusEnum.entity_type,
  );
  TestValidator.equals(
    "status enum value preserved",
    snapshot1.statusEnum.value,
    statusEnum.value,
  );
  TestValidator.equals(
    "status enum description preserved",
    snapshot1.statusEnum.description,
    statusEnum.description,
  );
  // 5. Test multiple snapshots with unique names
  const snapshot2 =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        params: { statusEnumId: statusEnum.id },
        body: {
          snapshotName: "System update snapshot March 2026",
          description: "Snapshot before system update for audit trail",
          snapshotReason: "System update preparation",
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  // 6. Validate snapshot names are unique
  TestValidator.notEquals(
    "snapshot names are unique",
    snapshot1.snapshot_name,
    snapshot2.snapshot_name,
  );
  // 7. Verify audit trail information
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot1.created_at !== null && snapshot1.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has update timestamp",
    snapshot1.updated_at !== null && snapshot1.updated_at.length > 0,
  );
  TestValidator.equals(
    "snapshot deleted_at is null for active snapshot",
    snapshot1.deleted_at,
    null,
  );
  // 8. Validate metadata fields
  TestValidator.equals(
    "snapshot reason preserved",
    snapshot1.snapshot_reason,
    "Quarterly compliance audit Q1 2026",
  );
  TestValidator.predicate(
    "snapshot description is present",
    snapshot1.description !== null && snapshot1.description!.length > 0,
  );
}
