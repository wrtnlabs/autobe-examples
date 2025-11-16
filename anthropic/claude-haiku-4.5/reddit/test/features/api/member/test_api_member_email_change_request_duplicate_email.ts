import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_email_change_request_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create first member with initial email
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = "Password123!@";
  const firstMemberUsername = RandomGenerator.alphabets(5);

  const firstMemberData = {
    email: firstMemberEmail,
    username: firstMemberUsername,
    password: firstMemberPassword,
    ip: "192.168.1.1",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const firstMember = await api.functional.auth.member.join(connection, {
    body: firstMemberData,
  });
  typia.assert(firstMember);

  // Store first member's authentication token
  const firstMemberAuthToken = firstMember.token.access;
  TestValidator.equals(
    "first member should be created successfully",
    firstMember.token.access !== "",
    true,
  );

  // Step 2: Create second member with a different email (using a fresh connection context)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "Password456!@";
  const secondMemberUsername = RandomGenerator.alphabets(5);

  const secondMemberData = {
    email: secondMemberEmail,
    username: secondMemberUsername,
    password: secondMemberPassword,
    ip: "192.168.1.2",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const secondMember = await api.functional.auth.member.join(connection, {
    body: secondMemberData,
  });
  typia.assert(secondMember);

  // Step 3: Restore first member's authentication context
  const firstMemberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: firstMemberAuthToken,
    },
  };

  // Step 4: First member attempts to change their email to the second member's email
  // This should fail with an error because the email is already taken
  await TestValidator.error(
    "email change request with duplicate email should fail",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
        firstMemberConnection,
        {
          body: {
            newEmail: secondMemberEmail,
            password: firstMemberPassword,
          } satisfies ICommunityPlatformMember.IEmailChangeRequest,
        },
      );
    },
  );
}
