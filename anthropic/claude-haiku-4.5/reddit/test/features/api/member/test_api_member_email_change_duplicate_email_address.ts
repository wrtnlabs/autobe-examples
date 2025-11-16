import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_email_change_duplicate_email_address(
  connection: api.IConnection,
) {
  // Step 1: Create first member account that owns the target email
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberResponse = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: firstMemberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "TestPassword123!",
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(firstMemberResponse);
  TestValidator.predicate(
    "first member account created with valid structure",
    firstMemberResponse.id !== null && firstMemberResponse.id !== undefined,
  );

  // Step 2: Create second member account that will attempt email change
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "SecondPassword123!";
  const secondMemberResponse = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: secondMemberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: secondMemberPassword,
        ip: "192.168.1.2",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(secondMemberResponse);

  // Step 3: Update connection to use second member's auth token for subsequent operations
  const secondMemberAuthToken = secondMemberResponse.token.access;
  connection.headers ??= {};
  connection.headers.Authorization = secondMemberAuthToken;

  // Step 4: Attempt to change second member's email to first member's email (duplicate)
  // This should fail because the email is already registered to another member
  await TestValidator.error(
    "duplicate email change request should be rejected",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
        connection,
        {
          body: {
            newEmail: firstMemberEmail,
            password: secondMemberPassword,
          } satisfies ICommunityPlatformMember.IEmailChangeRequest,
        },
      );
    },
  );

  // Step 5: Verify that the email change request was properly rejected
  // If we reached this point without exception in the test, the error was thrown as expected
  TestValidator.predicate(
    "email uniqueness constraint enforced - duplicate email change rejected successfully",
    true,
  );
}
