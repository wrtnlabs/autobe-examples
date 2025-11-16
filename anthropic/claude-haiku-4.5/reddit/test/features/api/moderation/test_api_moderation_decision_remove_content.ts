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

export async function test_api_moderation_decision_remove_content(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureAdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://community.example.com/auth/admin",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches registration",
    admin.email,
    adminEmail,
  );

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Discussion about technology topics",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (content creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "CreatorPassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: "Community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post with problematic content
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Offensive Content Post",
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_nsfw: true,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "post visibility is public",
    post.visibility_status,
    "public",
  );

  // Step 6: Create reporter member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "ReporterPassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // Step 7: Switch to reporter and submit report
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: "ReporterPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "hate_speech",
        additional_details:
          "Post contains offensive content and violates community standards",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.equals(
    "report category matches submission",
    report.category,
    "hate_speech",
  );

  // Step 8: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "ModeratorPassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 9: Moderator logs in and creates removal decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: post.id,
        body: {
          action_type: "remove_content",
          reason:
            "Post violates community standards by containing hate speech and offensive content targeting specific groups. Content has been removed to maintain community safety and comply with platform policy.",
          internal_notes:
            "Pattern of similar violations from this user detected. Monitor account for additional violations.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 10: Verify decision details
  TestValidator.equals(
    "decision action type is remove_content",
    decision.action_type,
    "remove_content",
  );
  TestValidator.predicate(
    "reason is minimum required length",
    decision.reason.length >= 10,
  );
  TestValidator.equals(
    "moderator ID matches decision creator",
    decision.moderator.id,
    moderator.id,
  );

  // Step 11: Verify suspension duration is null for remove_content action
  TestValidator.predicate(
    "suspension_duration_days is null for remove_content",
    decision.suspension_duration_days === null ||
      decision.suspension_duration_days === undefined,
  );

  // Step 12: Verify decision references the reported post
  TestValidator.predicate(
    "decision report exists",
    decision.report !== null && decision.report !== undefined,
  );

  // Step 13: Validate decision timestamps
  TestValidator.predicate(
    "created_at timestamp is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(decision.created_at),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(decision.updated_at),
  );

  // Step 14: Verify decision immutability properties
  TestValidator.predicate(
    "deleted_at is null for active decision",
    decision.deleted_at === null || decision.deleted_at === undefined,
  );
}
