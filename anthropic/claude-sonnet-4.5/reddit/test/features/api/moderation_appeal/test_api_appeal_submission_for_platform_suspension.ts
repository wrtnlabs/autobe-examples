import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test the workflow of a member submitting an appeal after receiving a
 * platform-wide suspension.
 *
 * This test validates the complete appeal submission process for platform
 * suspensions:
 *
 * 1. Create a member account that will be suspended and appeal
 * 2. Create an administrator account for issuing platform suspension
 * 3. Administrator issues a platform-wide suspension against the member
 * 4. Suspended member submits an appeal challenging the suspension
 * 5. Validate appeal creation with correct properties and routing
 */
export async function test_api_appeal_submission_for_platform_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Store member authentication token for later use
  const memberToken = member.token.access;

  // Step 2: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Administrator issues a platform-wide suspension
  const suspensionReasonCategory = "policy_violation";
  const suspensionReasonText = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 12,
  });
  const internalNotes = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: suspensionReasonCategory,
          suspension_reason_text: suspensionReasonText,
          internal_notes: internalNotes,
          is_permanent: false,
          expiration_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Validate suspension was created correctly
  TestValidator.equals(
    "suspended member ID matches",
    suspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension reason category matches",
    suspension.suspension_reason_category,
    suspensionReasonCategory,
  );
  TestValidator.equals("suspension is active", suspension.is_active, true);
  TestValidator.equals(
    "suspension is not permanent",
    suspension.is_permanent,
    false,
  );

  // Step 4: Switch back to member authentication by restoring member token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  // Submit appeal with comprehensive reasoning
  const appealText = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 6,
    wordMax: 10,
  });

  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          platform_suspension_id: suspension.id,
          appeal_type: "platform_suspension",
          appeal_text: appealText,
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 5: Validate appeal properties
  TestValidator.equals(
    "appeal type is platform_suspension",
    appeal.appeal_type,
    "platform_suspension",
  );
  TestValidator.equals(
    "appellant is the suspended member",
    appeal.appellant_member_id,
    member.id,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "appeal text matches submitted text",
    appeal.appeal_text,
    appealText,
  );
  TestValidator.predicate(
    "appeal text meets minimum length",
    appeal.appeal_text.length >= 50,
  );
  TestValidator.predicate(
    "appeal text meets maximum length",
    appeal.appeal_text.length <= 1000,
  );
  TestValidator.equals(
    "appeal is not escalated initially",
    appeal.is_escalated,
    false,
  );

  // Validate expected resolution timeframe (5-7 days for platform-level appeals)
  const expectedResolutionDate = new Date(appeal.expected_resolution_at);
  const createdAtDate = new Date(appeal.created_at);
  const daysDifference =
    (expectedResolutionDate.getTime() - createdAtDate.getTime()) /
    (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "expected resolution is within 5-7 days",
    daysDifference >= 5 && daysDifference <= 7,
  );
}
