import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
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
import { generate_random_discussion_board_super_admin_status_enums_references_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_references_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_enum_reference } from "../../../prepare/prepare_random_discussion_board_status_enum_reference";

export async function test_api_status_enums_references_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create status enumeration value for articles
  const statusEnum =
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
  typia.assert(statusEnum);
  // 3. Create initial reference relationship
  const initialReference =
    await generate_random_discussion_board_super_admin_status_enums_references_create(
      superAdminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          referenced_table: "discussion_board_articles",
          referenced_column: "status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(initialReference);
  // 4. Update the reference relationship with different table/column
  const updatedReference =
    await api.functional.discussionBoard.superAdmin.status_enums.references.update(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        referenceId: initialReference.id,
        body: {
          referenced_table: "discussion_board_comments",
          referenced_column: "status",
        } satisfies IDiscussionBoardStatusEnumReference.IUpdate,
      },
    );
  typia.assert(updatedReference);
  // 5. Validate update results
  TestValidator.equals(
    "reference ID remains unchanged",
    updatedReference.id,
    initialReference.id,
  );
  TestValidator.equals(
    "status enum ID remains unchanged",
    updatedReference.discussion_board_status_enums_id,
    statusEnum.id,
  );
  TestValidator.equals(
    "referenced table updated",
    updatedReference.referenced_table,
    "discussion_board_comments",
  );
  TestValidator.equals(
    "referenced column updated",
    updatedReference.referenced_column,
    "status",
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedReference.created_at,
    initialReference.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    new Date(updatedReference.updated_at) >
      new Date(updatedReference.created_at),
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedReference.deleted_at,
    null,
  );
}
