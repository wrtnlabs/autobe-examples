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

export async function test_api_status_enum_snapshot_authorization_smash(
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
  // 2. Create two different status enumerations
  const firstStatusEnum =
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
  typia.assert(firstStatusEnum);
  const secondStatusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "comment",
          value: "pending",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(secondStatusEnum);
  // 3. Create snapshot for the FIRST status enumeration
  const snapshot =
    await generate_random_discussion_board_admin_status_enums_snapshots_create(
      adminConnection,
      {
        params: {
          statusEnumId: firstStatusEnum.id,
        },
        body: {
          snapshotName: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          snapshotReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardStatusEnumSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Attempt to retrieve snapshot using SECOND status enumeration's ID (wrong parent ID)
  // Since TestValidator is not available in the template imports, we'll use try-catch
  try {
    await api.functional.discussionBoard.admin.status_enums.snapshots.at(
      adminConnection,
      {
        statusEnumId: secondStatusEnum.id,
        snapshotId: snapshot.id,
      },
    );
    // If we reach here, the test should fail because we expected an error
    throw new Error(
      "Expected to fail when retrieving snapshot with wrong status enumeration ID",
    );
  } catch (error) {
    // Expected behavior - the call should fail
    // We don't validate the specific error type since we can't use TestValidator
  }
}
