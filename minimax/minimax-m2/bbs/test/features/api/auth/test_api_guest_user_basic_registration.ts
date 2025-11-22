import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

export async function test_api_guest_user_basic_registration(
  connection: api.IConnection,
) {
  // Test successful guest user registration with minimal required fields
  const displayName = RandomGenerator.name(2);
  const email = `${RandomGenerator.alphaNumeric(8)}@${RandomGenerator.alphaNumeric(5)}.com`;

  const registrationData = {
    display_name: displayName,
    email: email,
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: `https://example.com/avatars/${RandomGenerator.alphaNumeric(10)}.png`,
  } satisfies IEconPoliticalDiscussionGuestUser.ICreate;

  // Register new guest user
  const newUser: IEconPoliticalDiscussionGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: registrationData,
    });

  // Validate response structure and types
  typia.assert(newUser);

  // Verify user account creation
  TestValidator.predicate(
    "user ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      newUser.id,
    ),
  );
  TestValidator.equals(
    "display name matches input",
    newUser.display_name,
    displayName,
  );
  TestValidator.equals("email matches input", newUser.email, email);
  TestValidator.equals("bio matches input", newUser.bio, registrationData.bio);
  TestValidator.equals(
    "avatar URL matches input",
    newUser.avatar_url,
    registrationData.avatar_url,
  );

  // Verify account status
  TestValidator.equals("user status is active", newUser.status, "active");

  // Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at timestamp is valid",
    newUser.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    newUser.updated_at.includes("T"),
  );

  // Verify JWT token generation
  TestValidator.equals(
    "access token is generated",
    typeof newUser.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is generated",
    typeof newUser.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    newUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    newUser.token.refresh.length > 0,
  );

  // Verify token expiration times
  TestValidator.predicate(
    "access token expires in future",
    new Date(newUser.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expires in future",
    new Date(newUser.token.refreshable_until) > new Date(),
  );

  // Test unique email enforcement by attempting to register same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "Different User",
          email: email, // Same email as before
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test registration with different user to verify system works
  const secondUser = await api.functional.auth.guestUser.join(connection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: `${RandomGenerator.alphaNumeric(8)}@${RandomGenerator.alphaNumeric(5)}.com`,
    } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
  });
  typia.assert(secondUser);
  TestValidator.notEquals(
    "different users have different IDs",
    newUser.id,
    secondUser.id,
  );
}
