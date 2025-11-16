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
 * Test creating a suspension decision with minimum allowed duration (1 day).
 *
 * This test validates the moderation decision API endpoint with the shortest
 * allowed suspension duration. Since the report creation API is not available
 * in the SDK, the test focuses on validating the decision creation API contract
 * and response structure when submitting a suspension decision with
 * suspension_duration_days=1, the minimum allowed value.
 *
 * Steps:
 *
 * 1. Create moderator account for making moderation decisions
 * 2. Create administrator account for category management
 * 3. Create category and community for test context
 * 4. Create a post in the community
 * 5. Authenticate as moderator
 * 6. Create a suspension decision with minimum 1-day duration
 * 7. Verify the decision was created with all expected fields and minimum duration
 */
export async function test_api_report_decision_create_suspend_minimum_duration(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        password: moderatorPassword,
        href: "https://example.com/auth/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        password: adminPassword,
        name: RandomGenerator.name(),
        href: "https://example.com/auth/administrator",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword,
        href: "https://example.com/auth/member",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Authenticate as administrator to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/auth/administrator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Authenticate as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/auth/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm-${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Authenticate as moderator to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a suspension decision with minimum 1-day duration
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "Post violates community harassment policy. User received prior warnings.",
          internal_notes:
            "Third violation by this user in 30 days. Minimum suspension applied.",
          suspension_duration_days: 1,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Verify decision action type is suspend_user
  TestValidator.equals(
    "decision action type should be suspend_user",
    decision.action_type,
    "suspend_user",
  );

  // Verify suspension duration is minimum 1 day
  TestValidator.equals(
    "suspension duration should be exactly 1 day (minimum allowed)",
    decision.suspension_duration_days,
    1,
  );

  // Verify reason meets minimum length requirement (10 characters)
  TestValidator.predicate(
    "reason should meet minimum length requirement of 10 characters",
    (decision.reason?.length ?? 0) >= 10,
  );

  // Verify decision has valid UUID format
  TestValidator.predicate(
    "decision id should be in uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      decision.id,
    ),
  );

  // Verify created_at timestamp is valid
  TestValidator.predicate(
    "created_at should be valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(decision.created_at),
  );

  // Verify moderator information is included
  TestValidator.predicate(
    "moderator should be included in decision",
    decision.moderator !== null && decision.moderator !== undefined,
  );

  // Verify moderator id matches authenticated moderator
  TestValidator.equals(
    "moderator id in decision should match authenticated moderator",
    decision.moderator.id,
    moderator.id,
  );
}
