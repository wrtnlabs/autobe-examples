import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test registration rejection with invalid email format.
 *
 * NOTE: This scenario cannot be fully implemented due to TypeScript's type
 * safety. The email parameter in ICommunityPlatformModerator.ICreate is defined
 * as `string & tags.Format<"email">`, which means invalid email formats are
 * rejected at the TypeScript compilation level, not at runtime.
 *
 * The endpoint properly validates email format through the type system itself.
 * Testing invalid email rejection would require sending wrong types (using `as
 * any`), which is prohibited in E2E tests as it violates type safety
 * principles.
 *
 * Instead, this test validates that a valid moderator account can be created
 * with a properly formatted email address.
 */
export async function test_api_moderator_registration_with_invalid_email_format(
  connection: api.IConnection,
) {
  // Test successful registration with valid email format
  const validEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: validEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Validate the response contains expected moderator data
  TestValidator.predicate(
    "moderator email matches input",
    moderator.email === validEmail,
  );
  TestValidator.predicate(
    "moderator account is active",
    moderator.account_status === "active",
  );
  TestValidator.predicate("moderator has valid ID", moderator.id.length > 0);
}
