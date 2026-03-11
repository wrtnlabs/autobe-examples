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

/**
 * Test unauthorized access attempt to update status enum reference without admin authentication.
 * Attempt to call the PUT endpoint without any authentication headers or tokens.
 * The system should respond with 401 Unauthorized or 403 Forbidden error, preventing
 * non-admin users from modifying status enum reference relationships.
 */
export async function test_api_status_enum_reference_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUIDs for status enum and reference
  const statusEnumId = typia.random<string & tags.Format<"uuid">>();
  const referenceId = typia.random<string & tags.Format<"uuid">>();
  // Create a valid update body with random table and column names
  const updateBody = {
    referenced_table: RandomGenerator.alphabets(10),
    referenced_column: RandomGenerator.alphabets(8),
  } satisfies IDiscussionBoardStatusEnumReference.IUpdate;
  // Attempt to call the PUT endpoint without authentication
  // This should fail with an authentication error
  await TestValidator.error(
    "unauthorized access to status enum reference update",
    async () => {
      await api.functional.discussionBoard.admin.status_enums.references.update(
        connection,
        {
          statusEnumId,
          referenceId,
          body: updateBody,
        },
      );
    },
  );
}
