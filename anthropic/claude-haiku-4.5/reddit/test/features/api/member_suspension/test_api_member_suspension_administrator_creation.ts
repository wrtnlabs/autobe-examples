import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";

/**
 * Test platform administrator creation of member suspensions.
 *
 * Validates that platform administrators can create member suspension records
 * at the system level, independent of community-specific moderation. This test
 * demonstrates the administrative override capability where administrators
 * issue platform-wide suspensions for system-level violations.
 *
 * Steps:
 *
 * 1. Create a platform administrator account via authentication join
 * 2. Create a member suspension record using administrator privileges
 * 3. Verify the suspension response contains all required fields and metadata
 * 4. Confirm the suspension is properly recorded in the system
 */
export async function test_api_member_suspension_administrator_creation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.equals(
    "administrator email matches input",
    administrator.email,
    adminEmail,
  );
  TestValidator.equals(
    "administrator account is active after creation",
    administrator.account_status,
    "active",
  );

  // Step 2: Create a member suspension record
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  const suspensionReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const suspensionStartTime = new Date().toISOString();
  const suspensionEndTime = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          community_platform_report_decision_id: reportDecisionId,
          suspension_reason: suspensionReason,
          suspended_at: suspensionStartTime,
          expires_at: suspensionEndTime,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 3: Verify suspension response contains all required fields
  TestValidator.equals(
    "suspension member ID matches input",
    suspension.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "suspension decision ID matches input",
    suspension.community_platform_report_decision_id,
    reportDecisionId,
  );
  TestValidator.equals(
    "suspension reason matches input",
    suspension.suspension_reason,
    suspensionReason,
  );
  TestValidator.predicate(
    "suspension is recorded with unique identifier",
    suspension.id.length > 0,
  );

  // Step 4: Verify suspension is properly recorded with correct timestamps
  TestValidator.predicate(
    "suspension start time is after now or current",
    new Date(suspension.suspended_at) <= new Date(suspensionStartTime),
  );
  TestValidator.predicate(
    "suspension expiration is set for future date",
    new Date(suspension.expires_at!) > new Date(suspensionStartTime),
  );
}
