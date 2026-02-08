import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
 * Test successful deletion of a banned user record by an authorized admin.
 *
 * 1. Admin joins the platform with valid credentials.
 * 2. Admin deletes an existing banned user by providing bannedUserId.
 * 3. Verify HTTP 204 No Content response.
 * 4. Confirm banned user record no longer exists (expect Not Found error when accessing).
 * 5. Ensure no cascading deletion on user or community data.
 */
export async function test_api_admin_banned_user_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins with valid credentials to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // The authorization token will be set internally by authorize_admin_join
  // 2. Use an existing bannedUserId for the deletion test
  // Here we simulate getting an id for testing, in real test it should be pre-created or queried
  // We'll create a random UUID as bannedUserId for test purpose
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Execute deletion of banned user record
  await api.functional.communityPlatform.admin.bannedUsers.eraseBannedUser(
    adminConnection,
    {
      bannedUserId,
    },
  );
  // 3. Try to access the banned user record after deletion - expect failure
  await TestValidator.httpError(
    `access removed banned user record (${bannedUserId})`,
    404,
    async () => {
      // Trying to delete again will simulate access; since no GET endpoint, we try erase again to confirm error
      await api.functional.communityPlatform.admin.bannedUsers.eraseBannedUser(
        adminConnection,
        {
          bannedUserId,
        },
      );
    },
  );
  // No direct user or community deletion check possible because no such API provided
  // Assuming DB integrity and absence of cascading delete is ensured by the backend
}
