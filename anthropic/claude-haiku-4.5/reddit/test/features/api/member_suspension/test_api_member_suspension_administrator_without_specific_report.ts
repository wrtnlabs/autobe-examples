import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";

/**
 * Test administrator creation of member suspensions for platform-wide
 * violations.
 *
 * This test validates the administrative workflow for creating member
 * suspensions at the platform level without requiring a specific community
 * report decision. Administrators have the authority to suspend members based
 * on platform policy violations, system security concerns, or cross-platform
 * violations that don't originate from specific community reports.
 *
 * The test flow:
 *
 * 1. Register as administrator with platform-level credentials
 * 2. Generate test suspension data with required fields
 * 3. Create a member suspension record via the administrator endpoint
 * 4. Validate the suspension record is properly created and contains all required
 *    information
 * 5. Verify the suspension includes correct timestamps and references
 */
export async function test_api_member_suspension_administrator_without_specific_report(
  connection: api.IConnection,
) {
  // Step 1: Register as administrator
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
      ip: undefined,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create suspension data
  const suspensionReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const now = new Date();
  const suspendedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspensionBody = {
    community_platform_member_id: typia.random<string & tags.Format<"uuid">>(),
    community_platform_report_decision_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    suspension_reason: `${suspensionReason} ${RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    })}`,
    suspended_at: suspendedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformMemberSuspension.ICreate;

  // Step 3: Create the member suspension
  const suspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: suspensionBody,
      },
    );
  typia.assert(suspension);

  // Step 4: Validate suspension record
  TestValidator.equals(
    "suspension member ID matches request",
    suspension.community_platform_member_id,
    suspensionBody.community_platform_member_id,
  );
  TestValidator.equals(
    "suspension report decision ID matches request",
    suspension.community_platform_report_decision_id,
    suspensionBody.community_platform_report_decision_id,
  );
  TestValidator.equals(
    "suspension reason matches request",
    suspension.suspension_reason,
    suspensionBody.suspension_reason,
  );
  TestValidator.equals(
    "suspended_at timestamp matches request",
    suspension.suspended_at,
    suspensionBody.suspended_at,
  );
  TestValidator.equals(
    "expires_at timestamp matches request",
    suspension.expires_at,
    suspensionBody.expires_at,
  );

  // Step 5: Verify suspension has required metadata
  TestValidator.predicate(
    "suspension has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      suspension.id,
    ),
  );
  TestValidator.predicate(
    "suspension created_at is present",
    suspension.created_at !== null && suspension.created_at !== undefined,
  );
  TestValidator.predicate(
    "suspension updated_at is present",
    suspension.updated_at !== null && suspension.updated_at !== undefined,
  );
  TestValidator.predicate(
    "suspension deleted_at is null for active suspension",
    suspension.deleted_at === null || suspension.deleted_at === undefined,
  );
}
