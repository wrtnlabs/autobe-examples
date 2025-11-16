import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Register the first member with a unique email to establish the baseline
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();

  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name().replace(/\s/g, "_"),
      email: firstMemberEmail,
      password: RandomGenerator.alphaNumeric(12),
      email_verified: false,
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(firstMember);

  // Validate that the first registration succeeded
  TestValidator.equals(
    "first member should be created",
    firstMember.member.email,
    firstMemberEmail,
  );

  // Step 2: Attempt to register a second member using the same email address
  // This should be blocked by the system to maintain email uniqueness
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.name().replace(/\s/g, "_"),
          email: firstMemberEmail, // Reuse the same email
          password: RandomGenerator.alphaNumeric(12),
          email_verified: false,
        } satisfies IEconomicDiscussionMember.ICreate,
      });
    },
  );

  // Step 3: Verify that the system maintains email uniqueness
  // The system should have blocked the duplicate registration
  console.log(
    `✓ Email uniqueness maintained: "${firstMemberEmail}" accounts created: 1`,
  );
}
