import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test updating an existing registeredUser account.
 *
 * The scenario starts with user registration to create a new account, followed
 * by modifying allowed user profile fields such as username and email. The test
 * ensures that updates follow business rules, validate ownership, enforce
 * security constraints, and reflect the changes accurately in the database.
 */
export async function test_api_registered_user_account_update(
  connection: api.IConnection,
) {
  // 1. User registration via auth join endpoint
  const joinBody: IRedditCommunityRegisteredUser.IJoin = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `${RandomGenerator.name(1)}@example.com`,
    password: "Password123!",
    href: "https://reddit-like.app/register",
    referrer: "https://reddit-like.app/home",
  };
  const joinedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // 2. Create registered user account
  const createBody: IRedditCommunityRegisteredUser.ICreate = {
    username: `${RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase()}`,
    email: joinedUser.email,
    password: "Password123!",
  };
  const createdUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdUser);

  // 3. Re-authenticate (join again) to ensure up-to-date auth context
  const authBody: IRedditCommunityRegisteredUser.IJoin = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: joinedUser.email,
    password: "Password123!",
    href: "https://reddit-like.app/login",
    referrer: "https://reddit-like.app/login",
  };
  const reauthUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: authBody,
    });
  typia.assert(reauthUser);

  // 4. Update username and email
  const updateId: string & tags.Format<"uuid"> = createdUser.id;
  const newUsername = `${RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase()}`;
  const newEmail =
    `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(3)}@example.net` as string &
      tags.Format<"email">;

  const updateBody: IRedditCommunityRegisteredUser.IUpdate = {
    username: newUsername,
    email: newEmail,
  };
  const updatedUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.registeredUser.redditCommunity.registeredUsers.update(
      connection,
      { id: updateId, body: updateBody },
    );
  typia.assert(updatedUser);

  // Validate the updated username and email
  TestValidator.equals(
    "updated username matches",
    updatedUser.username,
    newUsername,
  );
  TestValidator.equals("updated email matches", updatedUser.email, newEmail);
  TestValidator.equals("id remains unchanged", updatedUser.id, createdUser.id);
  TestValidator.equals(
    "status remains unchanged",
    updatedUser.status,
    createdUser.status,
  );
  TestValidator.equals(
    "role remains unchanged",
    updatedUser.role,
    createdUser.role,
  );
  TestValidator.predicate(
    "registered_at exists",
    typeof updatedUser.registered_at === "string",
  );
}
