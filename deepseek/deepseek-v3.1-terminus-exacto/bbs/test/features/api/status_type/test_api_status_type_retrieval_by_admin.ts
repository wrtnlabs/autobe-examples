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

/**
 * Test the successful retrieval of an active status type by an authenticated administrator.
 * 1. Authenticate as administrator using join endpoint to create admin session
 * 2. Call status type retrieval endpoint with valid statusTypeId UUID parameter
 * 3. Validate response contains all expected status type fields with is_active: true
 */
export async function test_api_status_type_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection by registering new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve a status type with valid UUID
  const statusType = await api.functional.discussionBoard.admin.status_types.at(
    adminConnection,
    {
      statusTypeId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(statusType);
  // 3. Validate specific business logic requirements
  TestValidator.equals("status type is active", statusType.is_active, true);
  // Additional validations based on DTO definition
  TestValidator.predicate(
    "has category field",
    () => typeof statusType.category === "string",
  );
  TestValidator.predicate(
    "has code field",
    () => typeof statusType.code === "string",
  );
  TestValidator.predicate(
    "has display_name field",
    () => typeof statusType.display_name === "string",
  );
  TestValidator.predicate(
    "has display_order field",
    () => typeof statusType.display_order === "number",
  );
  // Validate nullable fields
  if (statusType.description !== undefined && statusType.description !== null) {
    TestValidator.predicate(
      "description is string when present",
      () => typeof statusType.description === "string",
    );
  }
  if (statusType.deleted_at !== undefined && statusType.deleted_at !== null) {
    TestValidator.predicate("deleted_at is ISO date-time when present", () =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statusType.deleted_at!),
    );
  }
}
