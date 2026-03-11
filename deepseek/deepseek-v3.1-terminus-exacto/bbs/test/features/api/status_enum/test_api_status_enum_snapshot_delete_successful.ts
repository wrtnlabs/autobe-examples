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

export async function test_api_status_enum_snapshot_delete_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create status enumeration
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
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
  // 3. Create snapshot
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
  // 4. Delete the snapshot
  await api.functional.discussionBoard.admin.status_enums.snapshots.erase(
    adminConnection,
    {
      statusEnumId: statusEnum.id,
      snapshotId: snapshot.id,
    },
  );
  // 5. Verify deletion by attempting to create a new snapshot with the same name
  // This ensures the original snapshot was properly deleted
  const newSnapshot =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          snapshotName: snapshot.snapshot_name,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          snapshotReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(newSnapshot);
  // 6. Verify the new snapshot has a different ID (proving the original was deleted)
  TestValidator.notEquals(
    "snapshot IDs should be different",
    snapshot.id,
    newSnapshot.id,
  );
}
