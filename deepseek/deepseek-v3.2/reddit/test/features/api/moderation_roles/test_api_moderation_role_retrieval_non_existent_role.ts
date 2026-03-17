import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
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
 * Test admin attempting to retrieve a non-existent moderation role.
 *
 * 1. Authenticate as admin using authorize_admin_join utility function.
 * 2. Generate random UUIDs for communityId and roleId.
 * 3. Attempt to retrieve moderation role details with non-existent roleId.
 * 4. Verify that the system returns appropriate error (404) for non-existent resource.
 *
 * This tests error handling for missing moderation roles, ensuring the system
 * properly identifies non-existent resources and returns appropriate HTTP status.
 */
export async function test_api_moderation_role_retrieval_non_existent_role(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate random UUIDs for communityId and roleId
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentRoleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent moderation role
  // This should throw an error since the role doesn't exist
  await TestValidator.error(
    "admin should get 404 for non-existent moderation role",
    async () => {
      await api.functional.communityPlatform.admin.moderation_roles.at(
        adminConnection,
        {
          communityId,
          roleId: nonExistentRoleId,
        },
      );
    },
  );
}
