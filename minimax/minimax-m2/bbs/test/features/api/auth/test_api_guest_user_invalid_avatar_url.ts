import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

export async function test_api_guest_user_invalid_avatar_url(
  connection: api.IConnection,
) {
  // Test guest user registration with various invalid avatar URL formats
  // This validates URI format validation for the optional avatar_url field

  const validDisplayName = RandomGenerator.name();

  // Test case 1: Missing scheme (no http:// or https://)
  await TestValidator.error(
    "avatar URL missing scheme should be rejected",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: validDisplayName,
          email: typia.random<string & tags.Format<"email">>(),
          avatar_url: "example.com/avatar.jpg", // Missing scheme
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test case 2: Invalid protocol
  await TestValidator.error(
    "avatar URL with invalid protocol should be rejected",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: validDisplayName,
          email: typia.random<string & tags.Format<"email">>(),
          avatar_url: "ftp://example.com/avatar.jpg", // Invalid protocol
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test case 3: Malformed URL with spaces
  await TestValidator.error(
    "avatar URL with spaces should be rejected",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: validDisplayName,
          email: typia.random<string & tags.Format<"email">>(),
          avatar_url: "https://example .com/avatar.jpg", // Spaces in URL
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test case 4: Incomplete URL
  await TestValidator.error(
    "incomplete avatar URL should be rejected",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: validDisplayName,
          email: typia.random<string & tags.Format<"email">>(),
          avatar_url: "https://", // Incomplete URL
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test case 5: Invalid characters in URL
  await TestValidator.error(
    "avatar URL with invalid characters should be rejected",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: validDisplayName,
          email: typia.random<string & tags.Format<"email">>(),
          avatar_url: "https://example.com/avatar@#$.jpg", // Invalid special chars
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test case 6: Valid guest user registration without avatar_url (should succeed)
  const validGuestUser = await api.functional.auth.guestUser.join(connection, {
    body: {
      display_name: validDisplayName,
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
  });
  typia.assert(validGuestUser);
  TestValidator.equals(
    "valid guest user should be created",
    validGuestUser.email,
    validGuestUser.email,
  );
}
