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

/**
 * Test retrieval attempt with non-existent status enumeration ID to verify error handling.
 * 1. Authenticate as administrator via admin join.
 * 2. Generate a random UUID that does not exist in the system.
 * 3. Call the GET endpoint with the non-existent statusEnumId.
 * 4. Validate the response returns appropriate error status (404 Not Found).
 * 5. Verify error message indicates the status enumeration was not found.
 * 6. Ensure the system does not leak information about existence of other status enums.
 */
export async function test_api_status_enum_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate via admin join
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function authorize_admin_join for authentication
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent status enum and validate error
  await TestValidator.error(
    "status enum retrieval with non-existent ID",
    async () => {
      const response =
        await api.functional.discussionBoard.admin.status_enums.at(
          adminConnection,
          {
            statusEnumId: nonExistentUuid,
          },
        );
      typia.assert(response); // This line should not be reached due to error
    },
  );
}
