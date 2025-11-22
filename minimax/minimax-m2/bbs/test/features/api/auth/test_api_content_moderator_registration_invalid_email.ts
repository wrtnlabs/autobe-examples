import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

export async function test_api_content_moderator_registration_invalid_email(
  connection: api.IConnection,
) {
  // Test content moderator registration with invalid email formats

  // Generate valid base moderator data for testing
  const validModeratorData = {
    display_name: RandomGenerator.name(),
    password: "StrongPass123!",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  };

  // Test 1: Email missing @ symbol
  await TestValidator.error("email without @ symbol should fail", async () => {
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        ...validModeratorData,
        email: "invalidemail.com",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  });

  // Test 2: Email with multiple @ symbols
  await TestValidator.error(
    "email with multiple @ symbols should fail",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          ...validModeratorData,
          email: "user@@example.com",
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 3: Email with empty username part
  await TestValidator.error(
    "email with empty username should fail",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          ...validModeratorData,
          email: "@example.com",
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 4: Email with empty domain part
  await TestValidator.error("email with empty domain should fail", async () => {
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        ...validModeratorData,
        email: "user@",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  });

  // Test 5: Email with invalid domain format
  await TestValidator.error(
    "email with invalid domain format should fail",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          ...validModeratorData,
          email: "user@invalid_domain",
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 6: Email with special characters in domain
  await TestValidator.error(
    "email with invalid special characters in domain should fail",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          ...validModeratorData,
          email: "user@domain!.com",
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 7: Email with spaces
  await TestValidator.error("email with spaces should fail", async () => {
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        ...validModeratorData,
        email: "user name@example.com",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  });

  // Test 8: Very long email
  await TestValidator.error("excessively long email should fail", async () => {
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        ...validModeratorData,
        email: "verylongusername".repeat(10) + "@example.com",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  });

  // Test 9: Email without top-level domain
  await TestValidator.error(
    "email without top-level domain should fail",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          ...validModeratorData,
          email: "user@example",
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 10: Email with consecutive dots
  await TestValidator.error(
    "email with consecutive dots should fail",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          ...validModeratorData,
          email: "user..name@example.com",
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );
}
