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

export async function test_api_admin_status_type_update_display_order_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create initial status types with specific display_order values
  const statusType1 =
    await generate_random_discussion_board_admin_status_types_create(
      adminConnection,
      {
        body: {
          category: "article",
          code: RandomGenerator.alphabets(8),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 10,
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType1);
  const statusType2 =
    await generate_random_discussion_board_admin_status_types_create(
      adminConnection,
      {
        body: {
          category: "article",
          code: RandomGenerator.alphabets(8),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 20,
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType2);
  // 3. Test valid positive integer update
  const updated1 =
    await api.functional.discussionBoard.admin.status_types.update(
      adminConnection,
      {
        statusTypeId: statusType1.id,
        body: {
          display_order: 5,
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "display_order updated to positive integer",
    updated1.display_order,
    5,
  );
  TestValidator.equals(
    "other fields unchanged - category",
    updated1.category,
    statusType1.category,
  );
  TestValidator.equals(
    "other fields unchanged - code",
    updated1.code,
    statusType1.code,
  );
  // 4. Test zero value
  const updated2 =
    await api.functional.discussionBoard.admin.status_types.update(
      adminConnection,
      {
        statusTypeId: statusType2.id,
        body: {
          display_order: 0,
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "display_order updated to zero",
    updated2.display_order,
    0,
  );
  TestValidator.equals(
    "other fields unchanged - display_name",
    updated2.display_name,
    statusType2.display_name,
  );
  // 5. Test negative value (int32 allows negative)
  const updated3 =
    await api.functional.discussionBoard.admin.status_types.update(
      adminConnection,
      {
        statusTypeId: statusType1.id,
        body: {
          display_order: -5,
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  typia.assert(updated3);
  TestValidator.equals(
    "display_order updated to negative",
    updated3.display_order,
    -5,
  );
  // 6. Test large positive value within int32 range
  const updated4 =
    await api.functional.discussionBoard.admin.status_types.update(
      adminConnection,
      {
        statusTypeId: statusType2.id,
        body: {
          display_order: 2147483647,
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  typia.assert(updated4);
  TestValidator.equals(
    "display_order updated to max int32",
    updated4.display_order,
    2147483647,
  );
  // 7. Test partial update with multiple fields (display_order being one of them)
  const updated5 =
    await api.functional.discussionBoard.admin.status_types.update(
      adminConnection,
      {
        statusTypeId: statusType1.id,
        body: {
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 100,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  typia.assert(updated5);
  TestValidator.equals(
    "display_order updated with other fields",
    updated5.display_order,
    100,
  );
  TestValidator.notEquals(
    "display_name should be changed",
    updated5.display_name,
    statusType1.display_name,
  );
  TestValidator.notEquals(
    "description should be changed",
    updated5.description,
    statusType1.description,
  );
  // 8. Test minimal partial update (only display_order)
  const originalOrder = statusType2.display_order;
  const updated6 =
    await api.functional.discussionBoard.admin.status_types.update(
      adminConnection,
      {
        statusTypeId: statusType2.id,
        body: {
          display_order: 50,
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  typia.assert(updated6);
  TestValidator.equals(
    "only display_order changed",
    updated6.display_order,
    50,
  );
  TestValidator.equals(
    "other fields unchanged - is_active",
    updated6.is_active,
    statusType2.is_active,
  );
  TestValidator.predicate(
    "order should be different",
    updated6.display_order !== originalOrder,
  );
}
