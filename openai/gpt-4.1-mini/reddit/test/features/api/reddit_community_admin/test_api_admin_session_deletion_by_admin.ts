import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user to get authorization token
  const adminInitial: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "password123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminInitial);

  // 2. Create a new admin user
  const createdAdmin: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      {
        body: {
          email: `newadmin${RandomGenerator.alphaNumeric(6)}@example.com`,
          password: "password123",
        } satisfies IRedditCommunityRedditCommunityAdmin.ICreate,
      },
    );
  typia.assert(createdAdmin);

  // 3. Authenticate as the newly created admin to create a session
  const newAdminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: createdAdmin.email,
        password: "password123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(newAdminAuth);

  // 4. Extract the session ID from the token information
  // (Assuming here token.access encodes the session ID; since session ID is not separately returned, use access token itself as ID)
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(newAdminAuth.token.access);

  // 5. Delete the admin session by admin ID and session ID
  await api.functional.redditCommunity.admin.redditCommunity.admins.adminSessions.erase(
    connection,
    {
      id: createdAdmin.id,
      sessionId: sessionId,
    },
  );

  // 6. Validate that the admin remains valid by fetching or reauthenticating
  // (Not explicitly provided API for fetching admin by ID after session deletion; so reauthenticate again and check user ID)
  const reAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: createdAdmin.email,
        password: "password123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(reAuth);

  TestValidator.equals(
    "admin user ID still valid after session deletion",
    reAuth.id,
    createdAdmin.id,
  );
}
