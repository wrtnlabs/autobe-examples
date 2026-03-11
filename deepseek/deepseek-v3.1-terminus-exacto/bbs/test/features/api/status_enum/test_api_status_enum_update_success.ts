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

/**
 * Test successful update of an existing status enumeration value.
 *
 * 1. Authenticate as admin
 * 2. Create initial status enum with entity_type 'article', value 'draft', description 'Article in draft state'
 * 3. Update the status enum with new values: entity_type 'article', value 'published', description 'Article published and visible to users', sort_order 5, is_active true
 * 4. Validate the response contains updated values with refreshed timestamps
 * 5. Verify status enum ID remains unchanged and all fields are properly updated
 */
export async function test_api_status_enum_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial status enum to be updated
  const initialStatusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: "Article in draft state",
          sort_order: 1 satisfies number as number,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(initialStatusEnum);
  // 3. Update the status enum with new values
  const updateResult =
    await api.functional.discussionBoard.admin.status_enums.update(
      adminConnection,
      {
        statusEnumId: initialStatusEnum.id,
        body: {
          entity_type: "article",
          value: "published",
          description: "Article published and visible to users",
          sort_order: 5 satisfies number as number,
          is_active: true,
        } satisfies IDiscussionBoardStatusEnum.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 4. Validate the response contains updated values
  TestValidator.equals(
    "ID remains unchanged",
    updateResult.id,
    initialStatusEnum.id,
  );
  TestValidator.equals(
    "entity_type updated",
    updateResult.entity_type,
    "article",
  );
  TestValidator.equals("value updated", updateResult.value, "published");
  TestValidator.equals(
    "description updated",
    updateResult.description,
    "Article published and visible to users",
  );
  TestValidator.equals("sort_order updated", updateResult.sort_order, 5);
  TestValidator.predicate("is_active true", updateResult.is_active === true);
  // 5. Verify timestamps are refreshed (updated_at should be different)
  TestValidator.notEquals(
    "updated_at changed",
    updateResult.updated_at,
    initialStatusEnum.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updateResult.created_at,
    initialStatusEnum.created_at,
  );
  TestValidator.predicate(
    "deleted_at remains null",
    updateResult.deleted_at === null,
  );
}
