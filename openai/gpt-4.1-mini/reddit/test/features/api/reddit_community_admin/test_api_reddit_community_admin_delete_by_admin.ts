import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

/**
 * Test the complete workflow of deleting an admin user by their unique ID.
 *
 * This test function covers:
 *
 * 1. Registering a new admin user via post /auth/admin/join that returns access
 *    and refresh tokens to authenticate future requests.
 * 2. Using authenticated admin credentials to create a new admin user record via
 *    post /redditCommunity/admin/redditCommunity/admins.
 * 3. Deleting the created admin user by their ID via DELETE
 *    /redditCommunity/admin/redditCommunity/admins/{id}.
 *
 * The test verifies correct authentication and authorization flows, proper
 * creation and deletion of the admin user record, and ensures no unauthorized
 * access remains after deletion.
 *
 * @param connection Api.IConnection The API connection object.
 */
export async function test_api_reddit_community_admin_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user via join to obtain authentication tokens
  const adminCreateBody: IRedditCommunityAdmin.ICreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "securepassword123",
  };
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an admin user record using authenticated admin credentials
  const adminCreateUserBody: IRedditCommunityRedditCommunityAdmin.ICreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "anothersecurepassword",
  };
  const createdAdmin: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      {
        body: adminCreateUserBody,
      },
    );
  typia.assert(createdAdmin);

  // 3. Delete the created admin user by ID
  await api.functional.redditCommunity.admin.redditCommunity.admins.erase(
    connection,
    {
      id: createdAdmin.id,
    },
  );
}
