import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test updating a suspension to extend its expiration date. Administrator
 * retrieves an existing suspension and updates expires_at to a later timestamp,
 * effectively extending the restriction period. Verify that the update
 * operation properly validates the new expires_at is a valid ISO 8601 UTC
 * datetime, is logically after suspended_at, and is appropriately applied to
 * the suspension record. Confirm that updated_at timestamp reflects the
 * modification time while all immutable fields (id, member_id, decision_id,
 * suspended_at) remain unchanged. Validate that the extended expiration affects
 * member access enforcement going forward.
 *
 * Process:
 *
 * 1. Create and authenticate administrator account
 * 2. Create and authenticate member account
 * 3. Create and authenticate moderator account
 * 4. Member creates a post
 * 5. Reporter files violation report on the post
 * 6. Moderator creates suspension decision
 * 7. Administrator creates initial suspension record
 * 8. Administrator extends suspension by updating expiration date
 * 9. Verify update maintains immutable fields and updates mutable fields correctly
 */
export async function test_api_member_suspension_update_expiration_extension(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "https://example.com/member",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "ModeratorPassword123!",
        href: "https://example.com/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Member creates a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Reporter files violation report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 6. Moderator creates suspension decision
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.paragraph({ sentences: 3, wordMin: 4 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 7. Administrator creates initial suspension record
  const now = new Date();
  const suspensionStartDate = new Date(now.getTime()).toISOString();
  const initialExpirationDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const initialSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
          }),
          suspended_at: suspensionStartDate,
          expires_at: initialExpirationDate,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(initialSuspension);

  // Verify initial suspension properties
  TestValidator.equals(
    "initial suspension member ID matches",
    initialSuspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "initial suspension decision ID matches",
    initialSuspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.equals(
    "initial suspension start timestamp",
    initialSuspension.suspended_at,
    suspensionStartDate,
  );

  // 8. Administrator extends suspension by updating expiration date
  const extendedExpirationDate = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updatedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.update(
      connection,
      {
        suspensionId: initialSuspension.id,
        body: {
          expires_at: extendedExpirationDate,
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(updatedSuspension);

  // 9. Verify update maintains immutable fields and updates mutable fields correctly
  TestValidator.equals(
    "suspension ID unchanged after update",
    updatedSuspension.id,
    initialSuspension.id,
  );
  TestValidator.equals(
    "suspension member ID unchanged after update",
    updatedSuspension.community_platform_member_id,
    initialSuspension.community_platform_member_id,
  );
  TestValidator.equals(
    "suspension decision ID unchanged after update",
    updatedSuspension.community_platform_report_decision_id,
    initialSuspension.community_platform_report_decision_id,
  );
  TestValidator.equals(
    "suspension start time unchanged after update",
    updatedSuspension.suspended_at,
    initialSuspension.suspended_at,
  );
  TestValidator.notEquals(
    "suspension expiration date extended",
    updatedSuspension.expires_at,
    initialSuspension.expires_at,
  );
  TestValidator.equals(
    "suspension expiration date matches update value",
    updatedSuspension.expires_at,
    extendedExpirationDate,
  );

  // Verify updated_at timestamp reflects modification time
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    updatedSuspension.updated_at >= initialSuspension.created_at,
  );

  // Verify extended expiration is later than original
  TestValidator.predicate(
    "extended expiration is after initial expiration",
    new Date(updatedSuspension.expires_at!) >
      new Date(initialSuspension.expires_at!),
  );

  // Verify all immutable field constraints
  TestValidator.predicate(
    "expiration is after suspension start",
    new Date(updatedSuspension.expires_at!) >
      new Date(updatedSuspension.suspended_at),
  );
}
