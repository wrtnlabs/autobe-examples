import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test business error scenario where a super administrator attempts to delete an
 * attachment-category mapping that does not exist. First, register as super
 * administrator to gain administrative privileges. Then attempt to delete a
 * mapping using a randomly generated UUID that does not correspond to any
 * existing mapping record. Validate that the system returns an appropriate
 * error response (404 Not Found) indicating the mapping cannot be found.
 * This tests the system's validation of mapping existence before attempting
 * deletion, ensuring proper error handling for invalid or already-deleted
 * mapping IDs.
 */
export async function test_api_attachment_category_mapping_deletion_non_existent_mapping(
  connection: api.IConnection,
): Promise<void> {
  // Create dedicated connection for super administrator operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random UUID that does not correspond to any existing mapping
  const nonExistentMappingId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete non-existent mapping and validate error response
  await TestValidator.error("delete non-existent mapping", async () => {
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.erase(
      superAdminConnection,
      {
        mappingId: nonExistentMappingId satisfies string as string &
          tags.Format<"uuid">,
      },
    );
  });
}
