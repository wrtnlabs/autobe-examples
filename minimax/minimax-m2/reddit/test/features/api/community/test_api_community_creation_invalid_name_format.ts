import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community creation fails with invalid name format, validating naming
 * convention enforcement. User attempts to create community with names
 * containing special characters, spaces, or exceeding length limits. Scenario
 * validates that the platform enforces proper naming conventions (2-25
 * characters, alphanumeric and underscores only) and provides appropriate
 * validation errors for malformed community names.
 *
 * The test follows a comprehensive validation approach:
 *
 * 1. Register a new authenticated user using the registration API
 * 2. Test community creation with various invalid name formats:
 *
 *    - Names shorter than 2 characters (too short)
 *    - Names longer than 25 characters (exceeds limit)
 *    - Names containing spaces (invalid character)
 *    - Names with special characters like @, #, $, %, etc. (non-alphanumeric)
 *    - Names starting with numbers (pattern violation)
 *    - Names containing only numbers (pattern violation)
 * 3. Verify that each invalid name format triggers appropriate validation errors
 * 4. Confirm that the API rejects all malformed community names as expected
 * 5. Ensure proper error handling and response validation for each failure case
 *
 * This test validates the critical business rule that community names must be
 * 2-25 characters long and contain only alphanumeric characters and
 * underscores, preventing users from creating communities with improperly
 * formatted names that could cause issues in URLs, database entries, or user
 * interfaces.
 */
export async function test_api_community_creation_invalid_name_format(
  connection: api.IConnection,
) {
  // 1. Register a new user to create communities
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Test community names that are too short (less than 2 characters)
  await TestValidator.error(
    "community creation fails with single character name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "a", // Too short - only 1 character
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 3. Test community names that are too long (more than 25 characters)
  await TestValidator.error(
    "community creation fails with excessively long name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "this_is_an_extremely_long_community_name_that_exceeds_the_limit", // 26+ characters
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 4. Test community names containing spaces
  await TestValidator.error(
    "community creation fails with spaces in name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "test community with spaces", // Contains spaces
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 5. Test community names with special characters (@ symbol)
  await TestValidator.error(
    "community creation fails with @ symbol in name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "test@community", // Contains @ symbol
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 6. Test community names with special characters (hash symbol)
  await TestValidator.error(
    "community creation fails with # symbol in name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "test#community", // Contains # symbol
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 7. Test community names starting with numbers
  await TestValidator.error(
    "community creation fails with name starting with number",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "123test", // Starts with number
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 8. Test community names containing only numbers
  await TestValidator.error(
    "community creation fails with numeric-only name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "123456", // Only numbers
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 9. Test community names with hyphens
  await TestValidator.error(
    "community creation fails with hyphens in name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "test-community", // Contains hyphens
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 10. Test community names with dots
  await TestValidator.error(
    "community creation fails with dots in name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "test.community", // Contains dots
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 11. Test community names with other special characters
  await TestValidator.error(
    "community creation fails with special characters in name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "test$community", // Contains $ symbol
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 12. Test empty string community name
  await TestValidator.error(
    "community creation fails with empty name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "", // Empty string
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 13. Test community name with trailing spaces
  await TestValidator.error(
    "community creation fails with trailing spaces in name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "validname ", // Valid pattern but has trailing space
            title: "Test Community Title",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );
}
