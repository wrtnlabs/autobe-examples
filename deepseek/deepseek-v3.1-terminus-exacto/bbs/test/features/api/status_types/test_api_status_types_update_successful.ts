import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
import { generate_random_discussion_board_super_admin_status_types_create } from "../../../generate/generate_random_discussion_board_super_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

/**
 * Test the successful update of an existing status type by a super administrator.
 * 1. Authenticate as superAdmin using join endpoint
 * 2. Create a status type with valid data (category: 'article', code: 'draft', display_name: 'Draft')
 * 3. Update the status type with modified fields: display_name to 'Draft Article', description to 'Article in draft state', display_order to 5, is_active to false
 * 4. Validate response contains all updated fields correctly, id unchanged, updated_at timestamp reflects change
 */
export async function test_api_status_types_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial status type
  const createdStatus =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: "article" as string,
          code: "draft" as string,
          display_name: "Draft" as string,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(createdStatus);
  // 3. Update the status type
  const updateBody = {
    display_name: "Draft Article" as string,
    description: "Article in draft state" as string,
    display_order: 5 satisfies number as number,
    is_active: false as boolean,
  } satisfies IDiscussionBoardStatusType.IUpdate;
  const updatedStatus =
    await api.functional.discussionBoard.superAdmin.status_types.update(
      superAdminConnection,
      {
        statusTypeId: createdStatus.id,
        body: updateBody,
      },
    );
  typia.assert(updatedStatus);
  // 4. Validate response
  TestValidator.equals(
    "id remains unchanged",
    updatedStatus.id,
    createdStatus.id,
  );
  TestValidator.equals(
    "category unchanged",
    updatedStatus.category,
    createdStatus.category,
  );
  TestValidator.equals(
    "code unchanged",
    updatedStatus.code,
    createdStatus.code,
  );
  TestValidator.equals(
    "display_name updated",
    updatedStatus.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "description updated",
    updatedStatus.description,
    updateBody.description,
  );
  TestValidator.equals(
    "display_order updated",
    updatedStatus.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "is_active updated",
    updatedStatus.is_active,
    updateBody.is_active,
  );
  TestValidator.predicate(
    "updated_at newer than created_at",
    new Date(updatedStatus.updated_at).getTime() >
      new Date(createdStatus.created_at).getTime(),
  );
}
