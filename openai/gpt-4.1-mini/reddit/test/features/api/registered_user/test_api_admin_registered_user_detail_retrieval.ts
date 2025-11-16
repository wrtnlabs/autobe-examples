import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_admin_registered_user_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication)
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@admin.com",
    password: "SecurePass123!",
  } satisfies IRedditCommunityAdmin.ICreate;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a registered user to retrieve
  const registeredUserCreateBody = {
    username: RandomGenerator.alphaNumeric(6),
    email: RandomGenerator.alphaNumeric(5) + "@user.com",
    password: "UserPass123!",
  } satisfies IRedditCommunityRegisteredUser.ICreate;

  const registeredUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      {
        body: registeredUserCreateBody,
      },
    );
  typia.assert(registeredUser);

  // 3. Admin retrieves the created user details
  const retrievedUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.at(
      connection,
      { id: registeredUser.id },
    );
  typia.assert(retrievedUser);

  // 4. Validate the retrieved user matches the created user
  TestValidator.equals(
    "retrieved user id matches created user",
    retrievedUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "retrieved user username matches",
    retrievedUser.username,
    registeredUser.username,
  );
  TestValidator.equals(
    "retrieved user email matches",
    retrievedUser.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "retrieved user status is active",
    retrievedUser.status,
    "active",
  );
  TestValidator.equals(
    "retrieved user role matches",
    retrievedUser.role,
    registeredUser.role,
  );
  TestValidator.predicate(
    "retrieved user registered_at is valid ISO date-time",
    typeof retrievedUser.registered_at === "string",
  );
}
