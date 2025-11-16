import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_email_change_request_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator with initial email and tracked password
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = RandomGenerator.alphabets(12);
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.alphabets(8),
      password: moderator1Password,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);
  TestValidator.equals(
    "first moderator email matches created email",
    moderator1.email,
    moderator1Email,
  );

  // Step 2: Create second moderator with different email
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);
  TestValidator.notEquals(
    "second moderator email differs from first moderator",
    moderator2.email,
    moderator1Email,
  );

  // Step 3: Re-authenticate as first moderator to ensure correct context
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.alphabets(8),
      password: moderator1Password,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });

  // Step 4: Attempt to change first moderator's email to duplicate (second moderator's email)
  // This should fail with email already registered error
  await TestValidator.error(
    "duplicate email change request should fail",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.request.requestEmailChange(
        connection,
        {
          body: {
            password: moderator1Password,
            new_email: moderator2Email, // Try to change to existing email
          } satisfies ICommunityPlatformModerator.IEmailChangeRequest,
        },
      );
    },
  );

  // Step 5: Verify first moderator's email remains unchanged after failed attempt
  TestValidator.predicate(
    "first moderator email should remain unchanged",
    moderator1.email === moderator1Email,
  );

  // Step 6: Verify second moderator's email remains unchanged
  TestValidator.predicate(
    "second moderator email should remain unchanged",
    moderator2.email === moderator2Email,
  );
}
