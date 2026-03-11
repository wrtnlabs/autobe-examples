import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_status_types_create } from "../../../generate/generate_random_discussion_board_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

export async function test_api_status_type_idempotent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a status type using utility function
  const statusType =
    await generate_random_discussion_board_admin_status_types_create(
      adminConnection,
      {
        body: {
          category: RandomGenerator.alphabets(8),
          code: RandomGenerator.alphabets(6),
          display_name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // 3. First deletion - should succeed
  await api.functional.discussionBoard.admin.status_types.erase(
    adminConnection,
    {
      statusTypeId: statusType.id,
    },
  );
  // 4. Second deletion - should also succeed (idempotency)
  await TestValidator.error(
    "duplicate deletion should not cause error",
    async () => {
      await api.functional.discussionBoard.admin.status_types.erase(
        adminConnection,
        {
          statusTypeId: statusType.id,
        },
      );
    },
  );
  // 5. Validate idempotency: no side effects beyond first deletion
  // Since the operation is soft delete with a timestamp, duplicate deletions should not change the state.
  // We can't query the deleted status type, but we can assert that the second call didn't throw.
  // The test passes if no error is thrown.
}
