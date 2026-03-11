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
import { generate_random_discussion_board_super_admin_status_enums_snapshots_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_snapshots_create";
import { prepare_random_discussion_board_status_enum_snapshot } from "../../../prepare/prepare_random_discussion_board_status_enum_snapshot";

export async function test_api_status_enum_snapshot_invalid_reference_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test case 1: Non-existent UUID
  await TestValidator.httpError(
    "should reject non-existent status enum ID with 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.status_enums.snapshots.create(
        superAdminConnection,
        {
          statusEnumId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            snapshotReason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
        },
      );
    },
  );
  // Test case 2: Test invalid UUID format using SDK validation
  // Since we cannot send invalid types due to compilation constraints,
  // we test the business logic error handling with valid but non-existent UUIDs
  await TestValidator.httpError(
    "should handle invalid reference scenarios",
    [400, 404],
    async () => {
      await api.functional.discussionBoard.superAdmin.status_enums.snapshots.create(
        superAdminConnection,
        {
          statusEnumId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            snapshotReason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
        },
      );
    },
  );
}
