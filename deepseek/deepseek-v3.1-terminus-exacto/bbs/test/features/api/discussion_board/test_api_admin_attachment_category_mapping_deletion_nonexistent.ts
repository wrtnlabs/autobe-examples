import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test deletion attempt on non-existent attachment category mapping.
 * Authenticate as admin and attempt to delete a mapping using an invalid or
 * non-existent mappingId. Verify the system handles the error gracefully with
 * appropriate error response.
 */
export async function test_api_admin_attachment_category_mapping_deletion_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a random UUID that does not exist in the system
  const nonExistentMappingId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete non-existent mapping and expect error
  await TestValidator.error(
    "delete non-existent attachment category mapping",
    async () => {
      await api.functional.discussionBoard.admin.attachment_category_mappings.erase(
        adminConnection,
        {
          mappingId: nonExistentMappingId,
        },
      );
    },
  );
}
