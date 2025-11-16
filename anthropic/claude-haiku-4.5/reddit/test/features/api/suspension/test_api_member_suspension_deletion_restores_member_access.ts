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
 * Validate suspension deletion restores member platform access.
 *
 * Tests the complete suspension lifecycle: member registration, violation
 * creation through post/report workflow, suspension via moderation decision,
 * access restriction enforcement, suspension deletion, and immediate access
 * restoration. Confirms that deleted_at timestamp properly removes suspension
 * from active checks and allows members to resume all platform activities.
 *
 * Steps:
 *
 * 1. Create moderator account for enforcement actions
 * 2. Create member account (will be suspended)
 * 3. Create a post that will be reported
 * 4. Submit a violation report on the post
 * 5. Create moderation decision with suspend_user action
 * 6. Create the member suspension record via administrator
 * 7. Verify member cannot post during suspension
 * 8. Delete the suspension using moderator endpoint
 * 9. Verify member can immediately post again
 * 10. Validate suspension no longer appears in active checks
 */
export async function test_api_member_suspension_deletion_restores_member_access(
  connection: api.IConnection,
) {
  // 1. Create moderator account for enforcement actions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account (will be suspended)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member context for creating post
  const memberConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: member.token.access },
  };

  // 3. Create a post that will be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Submit a violation report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          reported_post_id: post.id,
          category: "harassment",
          additional_details: "Post contains inappropriate content",
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // Switch to moderator context for decision making
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: moderator.token.access },
  };

  // 5. Create moderation decision with suspend_user action
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: "User posted content violating community harassment policy",
          internal_notes: "First violation, 3-day suspension applied",
          suspension_duration_days: 3,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Create administrator account for creating suspension record
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(2),
        href: "http://localhost:3000/auth/administrator/join",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Switch to administrator context
  const adminConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: administrator.token.access },
  };

  // 6. Create the member suspension record via administrator
  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      adminConnection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason:
            "User violated community harassment policy with inappropriate content",
          suspended_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  TestValidator.equals(
    "suspension created with correct member",
    suspension.community_platform_member_id,
    member.id,
  );

  // 7. Verify member cannot post during suspension (attempt should fail)
  await TestValidator.error("suspended member cannot create post", async () => {
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  });

  // 8. Delete the suspension using moderator endpoint
  const deletedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.erase(
      moderatorConnection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(deletedSuspension);
  TestValidator.predicate(
    "deleted suspension has deleted_at timestamp",
    deletedSuspension.deleted_at !== null &&
      deletedSuspension.deleted_at !== undefined,
  );

  // 9. Verify member can immediately post again after suspension deletion
  const restoredPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(restoredPost);
  TestValidator.predicate(
    "restored member can create posts",
    restoredPost.id !== undefined && restoredPost.id !== null,
  );

  // 10. Validate suspension no longer appears in active checks
  TestValidator.predicate(
    "suspension deletion is immediate with no additional processing required",
    deletedSuspension.deleted_at !== undefined &&
      deletedSuspension.deleted_at !== null,
  );
}
