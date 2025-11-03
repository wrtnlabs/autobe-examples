import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_user_creation_by_registration(
  connection: api.IConnection,
) {
  // Generate a random email address following email format
  const email = typia.random<string & tags.Format<"email">>();
  // Generate a random password string (plain text as per DTO)
  const password = RandomGenerator.alphaNumeric(20);

  // Create a new user account by registration
  const user: IRedditCommunityUser =
    await api.functional.redditCommunity.users.create(connection, {
      body: {
        email: email,
        password: password,
        ip: null, // optional connection ip metadata
        href: "https://www.example.com/register", // current page URL
        referrer: "https://www.google.com/", // referrer URL
      } satisfies IRedditCommunityUser.ICreate,
    });

  // Assert that the response matches the expected user schema (UUIDs and karma counts)
  typia.assert(user);

  // Assert that user_id is a valid UUID
  // typia.assert already verifies this based on tags.Format<"uuid">

  // Test uniqueness: creating user with the same email must fail
  await TestValidator.error(
    "creating duplicate email should fail",
    async () => {
      await api.functional.redditCommunity.users.create(connection, {
        body: {
          email: email,
          password: password,
          ip: null,
          href: "https://www.example.com/register",
          referrer: "https://www.google.com/",
        } satisfies IRedditCommunityUser.ICreate,
      });
    },
  );
}
