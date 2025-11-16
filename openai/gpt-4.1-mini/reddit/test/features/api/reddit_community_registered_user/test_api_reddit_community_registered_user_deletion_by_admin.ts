import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_registered_user_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signup and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ComplexPass123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Registered user creation
  const userName = RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase();
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass123!"; // Note: password not part of the ICreate but usually
  const createdUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      {
        body: {
          username: userName,
          email: userEmail,
          password: userPassword,
        } satisfies IRedditCommunityRegisteredUser.ICreate,
      },
    );
  typia.assert(createdUser);

  // 3. Admin deletes the registered user
  await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.eraseRegisteredUser(
    connection,
    {
      id: createdUser.id,
    },
  );

  // 4. Post deletion - verify user is deleted (trying to delete again yields error)
  await TestValidator.error(
    "deleting already deleted user should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.eraseRegisteredUser(
        connection,
        { id: createdUser.id },
      );
    },
  );
}
