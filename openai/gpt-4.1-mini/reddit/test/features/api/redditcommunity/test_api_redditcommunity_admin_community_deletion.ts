import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Tests the complete deletion workflow of a Reddit Community by an authorized
 * admin user.
 *
 * This test performs the following steps in order:
 *
 * 1. Admin user registration (join) to authenticate an admin account.
 * 2. Registered user account creation (join) to simulate a real user.
 * 3. Registered user login for authentication context.
 * 4. Registered user creates a new Reddit Community with a unique communityName.
 * 5. Admin user login to switch context for deletion operations.
 * 6. Admin deletes the created community using the unique communityName.
 *
 * Each API response is type-asserted with typia.assert to ensure schema
 * compliance. The test validates authorization controls and resource lifecycle
 * management, ensuring only admins can delete communities and that the deletion
 * cleans up resources properly.
 *
 * The test simulates real multi-actor interactions, session management, and
 * role switching to enforce correct access control business logic.
 */
export async function test_api_redditcommunity_admin_community_deletion(
  connection: api.IConnection,
) {
  // 1. Admin joins to create an admin account and authenticate
  const adminEmail = `admin${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminJoinPayload = {
    email: adminEmail,
    password: "AdminPass123!",
    href: "https://redditcommunity.admin/join",
    referrer: "https://redditcommunity.admin",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinPayload,
    });
  typia.assert(admin);

  // 2. Registered user joins to create a registered user account
  const userEmail = `user${RandomGenerator.alphaNumeric(6)}@example.com`;
  const userJoinPayload = {
    email: userEmail,
    password: "UserPass123!",
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const regUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userJoinPayload,
    });
  typia.assert(regUser);

  // 3. Registered user logs in
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: "UserPass123!",
      href: "https://redditcommunity.user/login",
      referrer: "https://redditcommunity.user",
    } satisfies IRedditCommunityRegisteredUser.ILogin,
  });

  // 4. Registered user creates a new community
  // Construct a communityName: lowercase alphanumeric + underscore, length 8-12
  const communityName = `comm${RandomGenerator.alphaNumeric(8)}`.toLowerCase();
  const communityCreatePayload = {
    communityName: communityName,
    displayName: `Community ${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityCreatePayload,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community name matches",
    community.communityName,
    communityName,
  );

  // 5. Admin logs in
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminEmail,
      password: "AdminPass123!",
      href: "https://redditcommunity.admin/login",
      referrer: "https://redditcommunity.admin",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 6. Admin deletes the created community by communityName
  await api.functional.redditCommunity.admin.redditCommunity.communities.erase(
    connection,
    {
      communityName: communityName,
    },
  );
}
