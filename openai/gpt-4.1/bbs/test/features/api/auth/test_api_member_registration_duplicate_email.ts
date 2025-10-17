import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Ensure that duplicate email registration is rejected.
 *
 * 1. Register a member with a random valid email (and username/password)
 * 2. Attempt to register another member with the same email, but different
 *    username/password
 * 3. Validate that the API returns an error due to duplicate email constraint
 * 4. Ensure no session token is issued for the failed attempt
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register the initial account
  const email = typia.random<string & tags.Format<"email">>();
  const firstMemberBody = {
    email,
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;
  const firstRegistration = await api.functional.auth.member.join(connection, {
    body: firstMemberBody,
  });
  typia.assert(firstRegistration);
  TestValidator.equals(
    "registered email matches input",
    firstRegistration.email,
    email,
  );

  // 2. Attempt to register a second account with the same email
  const duplicateBody = {
    email, // exact same email as before
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;
  await TestValidator.error(
    "should reject duplicate email registration",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: duplicateBody,
      });
    },
  );
}
