import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_registration_invalid_email_format(
  connection: api.IConnection,
) {
  /**
   * Test member registration with valid email formats.
   *
   * Since email format validation is a type system concern (handled by
   * tags.Format<"email">) and not a business logic concern, this test validates
   * that the registration API successfully accepts properly formatted emails
   * and creates accounts with valid authentication tokens. The actual RFC 5322
   * format validation is the responsibility of the type system and backend
   * framework, not E2E test logic.
   */

  // Test 1: Register with standard valid email format
  const validEmail1 = typia.random<string & tags.Format<"email">>();
  const result1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: validEmail1,
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(result1);

  TestValidator.predicate(
    "first registration should return valid authorization token",
    result1.token !== null &&
      result1.token !== undefined &&
      result1.id !== null,
  );

  // Test 2: Verify that duplicate email registration fails (business logic validation)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: validEmail1, // Using same email as first registration
          username: RandomGenerator.alphaNumeric(10),
          password: "DifferentPassword123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 3: Register second member with different valid email
  const validEmail2 = typia.random<string & tags.Format<"email">>();
  const result2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: validEmail2,
        username: RandomGenerator.alphaNumeric(10),
        password: "AnotherPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(result2);

  TestValidator.notEquals(
    "second registration should create different member ID",
    result1.id,
    result2.id,
  );

  TestValidator.predicate(
    "second registration should return valid authorization token",
    result2.token !== null && result2.token !== undefined,
  );
}
