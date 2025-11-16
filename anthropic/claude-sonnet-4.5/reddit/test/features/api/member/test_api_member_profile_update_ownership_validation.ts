import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test ownership validation for member profile updates.
 *
 * This test validates that the API enforces proper ownership validation,
 * ensuring members can only update their own profiles and cannot modify other
 * members' profiles. This is a critical security test that verifies
 * unauthorized profile modifications are prevented.
 *
 * Test workflow:
 *
 * 1. Create first member account (Member A)
 * 2. Create second member account (Member B) - this sets Member B's token as
 *    active
 * 3. Attempt to update Member A's profile using Member B's active authentication
 * 4. Verify the operation fails with authorization error (ownership violation)
 */
export async function test_api_member_profile_update_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (Member A)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  const memberAPassword = typia.random<string & tags.MinLength<8>>();

  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: memberAUsername,
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberA);

  // Step 2: Create second member account (Member B)
  // The join operation automatically sets Member B's authentication token as active
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  const memberBPassword = typia.random<string & tags.MinLength<8>>();

  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: memberBUsername,
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberB);

  // Step 3: Attempt to update Member A's profile while authenticated as Member B
  // Member B's authentication token is currently active from the join operation
  // This should fail because Member B does not own Member A's profile
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityGuest.IUpdate;

  await TestValidator.error(
    "should reject profile update when authenticated member does not match target username",
    async () => {
      await api.functional.redditCommunity.member.members.update(connection, {
        username: memberAUsername,
        body: updateData,
      });
    },
  );

  // Test passes if the authorization error is thrown as expected
  // This confirms that ownership validation is properly enforced
}
