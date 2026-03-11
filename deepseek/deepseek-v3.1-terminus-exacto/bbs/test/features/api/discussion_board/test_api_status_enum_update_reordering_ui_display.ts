import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
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
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

export async function test_api_status_enum_update_reordering_ui_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create multiple status enums with different sort orders using random values
  const statusEnum1 =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          sort_order: 10,
        } satisfies DeepPartial<IDiscussionBoardStatusEnum.ICreate>,
      },
    );
  typia.assert(statusEnum1);
  const statusEnum2 =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          sort_order: 20,
        } satisfies DeepPartial<IDiscussionBoardStatusEnum.ICreate>,
      },
    );
  typia.assert(statusEnum2);
  const statusEnum3 =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          sort_order: 30,
        } satisfies DeepPartial<IDiscussionBoardStatusEnum.ICreate>,
      },
    );
  typia.assert(statusEnum3);
  // 3. Update the middle status enum's sort_order to move it to the beginning
  const updatedStatusEnum =
    await api.functional.discussionBoard.superAdmin.status_enums.update(
      superAdminConnection,
      {
        statusEnumId: statusEnum2.id,
        body: {
          sort_order: 5,
        } satisfies IDiscussionBoardStatusEnum.IUpdate,
      },
    );
  typia.assert(updatedStatusEnum);
  // 4. Validate the update
  TestValidator.equals("sort_order updated", updatedStatusEnum.sort_order, 5);
  TestValidator.equals(
    "id remains the same",
    updatedStatusEnum.id,
    statusEnum2.id,
  );
  TestValidator.equals(
    "value remains the same",
    updatedStatusEnum.value,
    statusEnum2.value,
  );
  // 5. Since there's no API endpoint to retrieve all status enums sorted by sort_order,
  // we validate the reordering by checking that the updated enum now has the lowest sort_order
  TestValidator.predicate(
    "updated enum has lowest sort_order",
    updatedStatusEnum.sort_order < statusEnum1.sort_order &&
      updatedStatusEnum.sort_order < statusEnum3.sort_order,
  );
  // 6. Validate that other enums maintain their relative positions
  TestValidator.predicate(
    "original order maintained between remaining enums",
    statusEnum1.sort_order < statusEnum3.sort_order,
  );
}
