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

export async function test_api_admin_status_type_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a status type to update
  const statusType =
    await generate_random_discussion_board_admin_status_types_create(
      adminConnection,
      {
        body: {
          category: "article",
          code: "draft",
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // 3. Update the status type with new values including null description
  const updateData = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: false,
  } satisfies IDiscussionBoardStatusType.IUpdate;
  const updatedStatusType =
    await api.functional.discussionBoard.admin.status_types.update(
      adminConnection,
      {
        statusTypeId: statusType.id,
        body: updateData,
      },
    );
  typia.assert(updatedStatusType);
  // 4. Validate response structure and updated values
  TestValidator.equals(
    "id remains unchanged",
    updatedStatusType.id,
    statusType.id,
  );
  TestValidator.equals(
    "category remains unchanged",
    updatedStatusType.category,
    statusType.category,
  );
  TestValidator.equals(
    "code remains unchanged",
    updatedStatusType.code,
    statusType.code,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedStatusType.created_at,
    statusType.created_at,
  );
  TestValidator.equals(
    "display_name updated",
    updatedStatusType.display_name,
    updateData.display_name,
  );
  TestValidator.equals(
    "description updated to null",
    updatedStatusType.description,
    updateData.description,
  );
  TestValidator.equals(
    "display_order updated",
    updatedStatusType.display_order,
    updateData.display_order,
  );
  TestValidator.equals(
    "is_active updated",
    updatedStatusType.is_active,
    updateData.is_active,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedStatusType.updated_at).getTime() >
      new Date(statusType.updated_at).getTime(),
  );
}
