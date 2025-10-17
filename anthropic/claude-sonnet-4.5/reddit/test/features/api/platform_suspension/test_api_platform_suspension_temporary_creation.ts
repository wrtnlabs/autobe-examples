import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test the complete workflow of issuing a temporary platform-wide suspension by
 * an administrator.
 *
 * The test validates the platform suspension feature where administrators can
 * temporarily suspend member accounts for policy violations. The scenario
 * follows this workflow:
 *
 * 1. Create a regular member account that will be the target of suspension
 * 2. Create an admin account to perform the suspension action
 * 3. Admin issues a 7-day temporary suspension with proper categorization and
 *    detailed reason
 * 4. Validate the suspension was created correctly with:
 *
 *    - Proper expiration date (7 days from creation)
 *    - Reason category and detailed text stored correctly
 *    - Suspension is active (is_active = true)
 *    - Not permanent (is_permanent = false)
 *    - References the correct suspended member
 *
 * This test ensures that administrators can successfully issue temporary
 * suspensions with proper metadata, which is critical for platform moderation
 * and user management.
 */
export async function test_api_platform_suspension_temporary_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a regular member account that will be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create an administrator account (connection becomes admin-authenticated)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Issue a 7-day temporary suspension
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const suspensionReasonCategories = [
    "spam",
    "harassment",
    "hate_speech",
    "inappropriate_content",
    "ban_evasion",
  ] as const;
  const selectedCategory = RandomGenerator.pick(suspensionReasonCategories);

  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: selectedCategory,
          suspension_reason_text: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          internal_notes: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          is_permanent: false,
          expiration_date: sevenDaysLater.toISOString(),
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 4: Validate the suspension properties
  TestValidator.equals(
    "suspended member ID matches",
    suspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension reason category matches",
    suspension.suspension_reason_category,
    selectedCategory,
  );
  TestValidator.equals(
    "suspension is not permanent",
    suspension.is_permanent,
    false,
  );
  TestValidator.equals("suspension is active", suspension.is_active, true);
  TestValidator.predicate(
    "suspension has expiration date",
    suspension.expiration_date !== null &&
      suspension.expiration_date !== undefined,
  );

  if (suspension.expiration_date) {
    const expirationDate = new Date(suspension.expiration_date);
    const timeDifference = Math.abs(
      expirationDate.getTime() - sevenDaysLater.getTime(),
    );
    TestValidator.predicate(
      "expiration date is approximately 7 days from now",
      timeDifference < 60000,
    );
  }
}
