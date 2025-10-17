import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test permanent platform suspension creation for severe policy violations.
 *
 * This test validates the complete workflow of issuing a permanent
 * platform-wide suspension for severe violations such as hate speech or illegal
 * content. The test ensures that administrators can permanently ban users from
 * the platform with proper documentation and audit trail.
 *
 * Test workflow:
 *
 * 1. Create a member account to be suspended
 * 2. Create an administrator account with suspension authority
 * 3. Issue a permanent platform suspension with detailed reasoning
 * 4. Validate suspension record creation with all required fields
 * 5. Verify permanent suspension characteristics (no expiration, active status)
 */
export async function test_api_platform_suspension_permanent_creation(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator account (admin now authenticated)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Issue permanent platform suspension for severe violation
  const suspensionReasonCategory = "hate_speech";
  const suspensionReasonText =
    "User posted severe hate speech targeting protected groups, repeated offensive content after warnings, and demonstrated pattern of harassment violating community guidelines.";
  const internalNotes =
    "Escalated from community moderators. Multiple reports from users. Reviewed content violates platform policy on hate speech.";

  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: suspensionReasonCategory,
          suspension_reason_text: suspensionReasonText,
          internal_notes: internalNotes,
          is_permanent: true,
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 4: Validate suspension record
  TestValidator.equals(
    "suspended member ID matches",
    suspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension reason category is correct",
    suspension.suspension_reason_category,
    suspensionReasonCategory,
  );
  TestValidator.equals(
    "suspension reason text matches",
    suspension.suspension_reason_text,
    suspensionReasonText,
  );
  TestValidator.equals(
    "is_permanent flag is true",
    suspension.is_permanent,
    true,
  );
  TestValidator.equals(
    "expiration_date is undefined for permanent suspension",
    suspension.expiration_date,
    undefined,
  );
  TestValidator.equals("suspension is active", suspension.is_active, true);
  TestValidator.predicate(
    "suspension has valid ID",
    suspension.id !== null && suspension.id !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    suspension.created_at !== null && suspension.created_at !== undefined,
  );
}
