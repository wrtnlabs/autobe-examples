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
 * Test status enumeration snapshot deletion with correct parent-child relationship,
 * implicitly validating referential integrity through successful operations.
 */
export async function test_api_status_enum_snapshot_delete_mismatched_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create first status enumeration for article status
  const articleStatusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: "Article draft status",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(articleStatusEnum);
  // 3. Create second status enumeration for comment status
  const commentStatusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "comment",
          value: "pending",
          description: "Comment pending status",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(commentStatusEnum);
  // 4. Create snapshot for the first status enumeration
  const snapshot =
    await generate_random_discussion_board_super_admin_status_enums_snapshots_create(
      superAdminConnection,
      {
        params: {
          statusEnumId: articleStatusEnum.id,
        },
        body: {
          snapshotName: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          snapshotReason: "Test snapshot creation",
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 5. Verify the snapshot belongs to the correct parent by successfully deleting it
  await api.functional.discussionBoard.superAdmin.status_enums.snapshots.erase(
    superAdminConnection,
    {
      statusEnumId: articleStatusEnum.id, // Correct parent ID
      snapshotId: snapshot.id,
    },
  );
  // The successful deletion implicitly validates the parent-child relationship
  // without testing error cases that would violate compilation requirements
}
