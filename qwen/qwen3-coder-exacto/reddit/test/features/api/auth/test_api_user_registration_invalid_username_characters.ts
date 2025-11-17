import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_registration_invalid_username_characters(
  connection: api.IConnection,
) {
  // Test various invalid username characters
  const invalidUsernames = [
    "user@name", // Contains @ symbol
    "user name", // Contains space
    "user-name", // Contains hyphen
    "user.name", // Contains dot
    "user+name", // Contains plus
    "user#name", // Contains hash
    "user$name", // Contains dollar sign
    "user%name", // Contains percent
    "user^name", // Contains caret
    "user&name", // Contains ampersand
    "user*name", // Contains asterisk
    "user(name", // Contains parenthesis
    "user)name", // Contains parenthesis
    "user[name", // Contains bracket
    "user]name", // Contains bracket
    "user{name", // Contains brace
    "user}name", // Contains brace
    "user|name", // Contains pipe
    "user\\name", // Contains backslash
    "user/name", // Contains forward slash
    "user'name", // Contains single quote
    'user"name', // Contains double quote
    "user;name", // Contains semicolon
    "user:name", // Contains colon
    "user,name", // Contains comma
    "user?name", // Contains question mark
    "user!name", // Contains exclamation mark
    "user~name", // Contains tilde
    "user`name", // Contains backtick
  ];

  // Test each invalid username and expect failure
  for (const invalidUsername of invalidUsernames) {
    await TestValidator.error(
      `registration should fail with invalid username: ${invalidUsername}`,
      async () => {
        await api.functional.auth.user.join(connection, {
          body: {
            email: `${invalidUsername}@test.com`,
            password: "password123",
            username: invalidUsername,
          } satisfies ICommunityForumCommunityUser.IJoin,
        });
      },
    );
  }

  // Test that valid usernames still work
  const validUsernames = [
    "validuser123",
    "valid_user",
    "user123",
    "user_name_123",
    "_username_",
    "1234567890",
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ];

  for (const validUsername of validUsernames) {
    // Only test valid usernames that are within length limits
    if (validUsername.length >= 3 && validUsername.length <= 21) {
      const user: ICommunityForumCommunityUser.IAuthorized =
        await api.functional.auth.user.join(connection, {
          body: {
            email: `${validUsername}@valid.com`,
            password: "password123",
            username: validUsername,
          } satisfies ICommunityForumCommunityUser.IJoin,
        });
      typia.assert(user);
      TestValidator.equals(
        "username should match",
        user.username,
        validUsername,
      );
    }
  }
}
