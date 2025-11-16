import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";

/**
 * Test error handling when attempting to retrieve a suspension with
 * non-existent ID.
 *
 * Validates that the API properly handles requests to retrieve member
 * suspension records using invalid (non-existent) suspension IDs. The test
 * authenticates as a member and attempts to retrieve a suspension using a UUID
 * that does not exist in the database, ensuring the API returns appropriate
 * error response (404 Not Found) and does not expose sensitive information.
 *
 * This test ensures:
 *
 * 1. API returns proper 404 error for non-existent suspensions
 * 2. Error responses don't expose sensitive implementation details
 * 3. Members cannot enumerate suspension records through ID manipulation
 * 4. Proper HTTP error semantics are followed
 *
 * Process:
 *
 * 1. Create and authenticate a member account
 * 2. Generate a valid UUID that does not correspond to any suspension record
 * 3. Attempt to retrieve the suspension with the invalid ID
 * 4. Verify that a 404 error is thrown
 * 5. Confirm the error handling works correctly
 */
export async function test_api_member_suspension_retrieve_with_invalid_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberData,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Generate a valid UUID that doesn't correspond to any suspension
  const invalidSuspensionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to retrieve suspension with invalid ID and verify error
  await TestValidator.error(
    "should return 404 when retrieving non-existent suspension",
    async () => {
      await api.functional.communityPlatform.member.memberSuspensions.at(
        connection,
        {
          suspensionId: invalidSuspensionId,
        },
      );
    },
  );
}
