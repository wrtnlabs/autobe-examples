import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
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
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

export async function test_api_status_enum_update_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create first status enum: entity_type "user", value "active"
  const firstEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "user",
          value: "active",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(firstEnum);
  // 3. Create second status enum: entity_type "user", value "banned"
  const secondEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "user",
          value: "banned",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(secondEnum);
  // 4. Attempt to update second enum to value "active" (duplicate combination)
  await TestValidator.error(
    "duplicate entity_type and value combination should fail",
    async () => {
      await api.functional.discussionBoard.admin.status_enums.update(
        adminConnection,
        {
          statusEnumId: secondEnum.id,
          body: {
            value: "active",
          } satisfies IDiscussionBoardStatusEnum.IUpdate,
        },
      );
    },
  );
  // 5. Verify first enum remains unchanged (data integrity)
  const unchanged =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "user",
          value: "active",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(unchanged);
  TestValidator.equals(
    "first status enum value unchanged",
    firstEnum.value,
    "active",
  );
  TestValidator.equals(
    "first status enum entity_type unchanged",
    firstEnum.entity_type,
    "user",
  );
}
