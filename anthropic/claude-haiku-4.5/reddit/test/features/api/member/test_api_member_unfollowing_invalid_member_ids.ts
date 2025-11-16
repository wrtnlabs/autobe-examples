import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test unfollow with non-existent member relationships.
 *
 * This scenario validates the unfollow endpoint behavior when attempting to
 * unfollow relationships that don't exist. The test will attempt unfollow
 * requests with valid UUID format parameters but for member IDs that either
 * don't exist or don't have a following relationship established. All such
 * requests should fail with appropriate business logic errors. This ensures the
 * API properly validates that a follow relationship exists before attempting to
 * delete it.
 *
 * Test flow:
 *
 * 1. Create first member account via authentication join endpoint
 * 2. Create second member account via authentication join endpoint
 * 3. Attempt to unfollow with valid UUIDs but non-existent relationship
 * 4. Attempt to unfollow using completely non-existent member IDs (valid UUID
 *    format)
 * 5. Verify that all requests properly fail with appropriate business logic errors
 */
export async function test_api_member_unfollowing_invalid_member_ids(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: Create second member account
  const secondMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 3: Test unfollow with non-existent relationship
  // Both members exist but no follow relationship was established
  await TestValidator.error(
    "should reject unfollow when no follow relationship exists",
    async () => {
      await api.functional.communityPlatform.members.following.erase(
        connection,
        {
          memberId: firstMember.id,
          followingId: secondMember.id,
        },
      );
    },
  );

  // Step 4: Test unfollow with completely non-existent member IDs
  // Use valid UUID format but non-existent member IDs
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const anotherNonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject unfollow with non-existent memberId",
    async () => {
      await api.functional.communityPlatform.members.following.erase(
        connection,
        {
          memberId: nonExistentMemberId,
          followingId: secondMember.id,
        },
      );
    },
  );

  await TestValidator.error(
    "should reject unfollow with non-existent followingId",
    async () => {
      await api.functional.communityPlatform.members.following.erase(
        connection,
        {
          memberId: firstMember.id,
          followingId: anotherNonExistentId,
        },
      );
    },
  );

  // Step 5: Test with both non-existent IDs
  await TestValidator.error(
    "should reject unfollow when both member IDs are non-existent",
    async () => {
      await api.functional.communityPlatform.members.following.erase(
        connection,
        {
          memberId: typia.random<string & tags.Format<"uuid">>(),
          followingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
