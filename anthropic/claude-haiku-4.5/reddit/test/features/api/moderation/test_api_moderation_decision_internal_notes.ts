import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_decision_internal_notes(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "MemberPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create a report on the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: "This post contains spam content",
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 7. Create moderator account and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 8. Create moderation decision with required fields only
  const decisionWithoutNotes =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "remove_content",
          reason: "Content violates community spam policy guidelines",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithoutNotes);
  TestValidator.predicate(
    "decision without notes should have no internal_notes",
    decisionWithoutNotes.internal_notes === null ||
      decisionWithoutNotes.internal_notes === undefined,
  );

  // 9. Create another report and decision with internal_notes
  const report2 = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "This post contains harassment",
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report2);

  const internalNotesText =
    "Third violation by this user in 30 days. Pattern of targeted harassment detected. Monitor for escalation.";
  const decisionWithNotes =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report2.id,
        body: {
          action_type: "issue_warning",
          reason: "User has engaged in harassment behavior",
          internal_notes: internalNotesText,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithNotes);

  // 10. Verify internal_notes are stored correctly
  TestValidator.equals(
    "decision with notes should store internal_notes correctly",
    decisionWithNotes.internal_notes,
    internalNotesText,
  );

  // 11. Verify reason is always present and minimum 10 characters
  TestValidator.predicate(
    "reason should be minimum 10 characters",
    decisionWithNotes.reason.length >= 10,
  );

  // 12. Verify action_type is correctly stored
  TestValidator.equals(
    "action_type should be issue_warning",
    decisionWithNotes.action_type,
    "issue_warning",
  );

  // 13. Verify decision moderator is populated
  typia.assert(decisionWithNotes.moderator);
  TestValidator.equals(
    "moderator username should be set",
    decisionWithNotes.moderator.username,
    moderator.username,
  );

  // 14. Verify report reference is populated in decision
  typia.assert(decisionWithNotes.report);
  TestValidator.equals(
    "report id should match",
    decisionWithNotes.report.id,
    report2.id,
  );
}
