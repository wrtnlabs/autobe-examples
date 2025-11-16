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

/**
 * Test reporter contact email functionality in content reports.
 *
 * Validates that reports can optionally include a reporter's email address for
 * notifications about moderation decisions. Tests both scenarios: with email
 * provided and without (null).
 *
 * Setup workflow:
 *
 * 1. Create admin account and switch to admin context
 * 2. Create content category
 * 3. Create member account and switch to member context
 * 4. Create community
 * 5. Create post in community
 * 6. Submit report with reporter_contact_email
 * 7. Verify email is stored and accessible
 * 8. Submit report without reporter_contact_email
 * 9. Verify null email handling
 */
export async function test_api_content_report_with_reporter_contact_email(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create content category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussion category",
          display_order: 1,
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: "MemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Sample Post Title",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Submit report WITH reporter_contact_email
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reportWithEmail: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details:
          "This post appears to be spam content that violates community standards.",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(reportWithEmail);

  // Step 7: Verify email is stored and accessible
  TestValidator.equals(
    "report with email should have reporter_contact_email",
    reportWithEmail.reporter_contact_email,
    reporterEmail,
  );

  // Step 8: Submit report WITHOUT reporter_contact_email
  const reportWithoutEmail: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details:
          "This post contains harassing content directed at community members.",
        reporter_contact_email: null,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(reportWithoutEmail);

  // Step 9: Verify null email handling
  TestValidator.equals(
    "report without email should have null reporter_contact_email",
    reportWithoutEmail.reporter_contact_email,
    null,
  );

  // Additional validation: Verify report metadata and core fields
  TestValidator.equals(
    "report status should be submitted",
    reportWithEmail.status,
    "submitted",
  );
  TestValidator.predicate(
    "report should have spam category",
    reportWithEmail.category === "spam",
  );
  TestValidator.predicate(
    "report should have valid reporter",
    reportWithEmail.reporter.id === member.id,
  );
  TestValidator.predicate(
    "report should have additional details",
    reportWithEmail.additional_details !== null &&
      reportWithEmail.additional_details !== undefined,
  );
}
