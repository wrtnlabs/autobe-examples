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

export async function test_api_status_enum_snapshot_creation_compliance_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a status enumeration to snapshot
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: "published",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create snapshot with metadata
  const snapshotBody = {
    snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    snapshotReason: "Compliance audit for Q1 2024",
  } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate;
  const snapshot =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        body: snapshotBody,
        params: { statusEnumId: statusEnum.id },
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot includes complete status enum configuration
  TestValidator.equals(
    "snapshot has status enum reference",
    snapshot.statusEnum.id,
    statusEnum.id,
  );
  TestValidator.equals(
    "entity_type preserved",
    snapshot.statusEnum.entity_type,
    statusEnum.entity_type,
  );
  TestValidator.equals(
    "value preserved",
    snapshot.statusEnum.value,
    statusEnum.value,
  );
  TestValidator.equals(
    "description preserved",
    snapshot.statusEnum.description,
    statusEnum.description,
  );
  TestValidator.equals(
    "sort_order preserved",
    snapshot.statusEnum.sort_order,
    statusEnum.sort_order,
  );
  TestValidator.predicate(
    "is_active preserved",
    snapshot.statusEnum.is_active === statusEnum.is_active,
  );
  // 5. Verify snapshot metadata is properly recorded
  TestValidator.equals(
    "snapshot name recorded",
    snapshot.snapshot_name,
    snapshotBody.snapshotName,
  );
  TestValidator.equals(
    "snapshot description recorded",
    snapshot.description,
    snapshotBody.description,
  );
  TestValidator.equals(
    "snapshot reason recorded",
    snapshot.snapshot_reason,
    snapshotBody.snapshotReason,
  );
  // 6. Validate system-generated fields
  TestValidator.predicate(
    "snapshot has id",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(snapshot.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(snapshot.updated_at).getTime()),
  );
  TestValidator.predicate("deleted_at is null", snapshot.deleted_at === null);
  // 7. Validate timestamp relationship
  TestValidator.predicate(
    "snapshot created after status enum",
    new Date(snapshot.created_at) >= new Date(statusEnum.created_at),
  );
  // 8. Test error handling for non-existent status enum ID
  await TestValidator.error(
    "should fail with non-existent status enum ID",
    async () => {
      await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
        superAdminConnection,
        {
          body: {
            snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
          params: {
            statusEnumId: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
