import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_status_enum_reference_update_correct_table_mapping(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Since specific status enum and reference creation endpoints aren't provided,
  // we'll use random valid UUIDs that would represent existing entities
  const statusEnumId = typia.random<string & tags.Format<"uuid">>();
  const referenceId = typia.random<string & tags.Format<"uuid">>();
  // Use realistic table and column names that would exist in the discussion board schema
  const updateBody = {
    referenced_table: "discussion_board_articles",
    referenced_column: "status",
  } satisfies IDiscussionBoardStatusEnumReference.IUpdate;
  const updatedReference =
    await api.functional.discussionBoard.admin.status_enums.references.update(
      adminConnection,
      {
        statusEnumId,
        referenceId,
        body: updateBody,
      },
    );
  typia.assert(updatedReference);
  // Validate response contains correct data
  TestValidator.equals(
    "reference ID matches",
    updatedReference.id,
    referenceId,
  );
  TestValidator.equals(
    "status enum ID matches",
    updatedReference.discussion_board_status_enums_id,
    statusEnumId,
  );
  TestValidator.equals(
    "referenced table updated",
    updatedReference.referenced_table,
    "discussion_board_articles",
  );
  TestValidator.equals(
    "referenced column updated",
    updatedReference.referenced_column,
    "status",
  );
  // Validate timestamps indicate successful update
  const createdAt = new Date(updatedReference.created_at);
  const updatedAt = new Date(updatedReference.updated_at);
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    updatedAt > createdAt,
  );
  // Validate the reference is active (not soft deleted)
  TestValidator.equals(
    "deleted_at should be null for active reference",
    updatedReference.deleted_at,
    null,
  );
  // Validate referential integrity by ensuring the response contains valid data
  TestValidator.predicate(
    "referenced table name is valid",
    updatedReference.referenced_table.length > 0,
  );
  TestValidator.predicate(
    "referenced column name is valid",
    updatedReference.referenced_column.length > 0,
  );
}
