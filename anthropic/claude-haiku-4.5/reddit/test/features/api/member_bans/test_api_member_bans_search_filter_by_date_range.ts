import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberBan";

export async function test_api_member_bans_search_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Set up test data - Create multiple user accounts for testing
  // Administrator setup
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/auth/admin",
        referrer: "https://example.com/login",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Moderator setup
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
        href: "https://example.com/auth/moderator",
        referrer: "https://example.com/login",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create members to ban
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "https://example.com/auth/member",
        referrer: "https://example.com/register",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "https://example.com/auth/member",
        referrer: "https://example.com/register",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  const member3Email: string = typia.random<string & tags.Format<"email">>();
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "https://example.com/auth/member",
        referrer: "https://example.com/register",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // Step 3: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member context and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "TestPassword123!",
      href: "https://example.com/auth/member",
      referrer: "https://example.com/login",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post from member1
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post",
        content_text: "This is test content",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Switch to moderator context for creating reports and decisions
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/auth/moderator",
      referrer: "https://example.com/login",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Create report decisions for each member at different times
  // Create decisions with staggered timestamps
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
  const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

  // Create a mock report decision for member1 (past)
  const decision1: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "ban_user",
          reason: "Test ban reason for past date violation policy breach",
          suspension_duration_days: 30,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  // Create a mock report decision for member2 (recent)
  const decision2: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "ban_user",
          reason:
            "Test ban reason for recent date violation policy enforcement",
          suspension_duration_days: 30,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // Create a mock report decision for member3 (recent)
  const decision3: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "ban_user",
          reason:
            "Test ban reason for recent date multiple violations detected",
          suspension_duration_days: 30,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision3);

  // Step 8: Create member bans with different dates
  const ban1: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member1.id,
          community_platform_report_decision_id: decision1.id,
          ban_reason:
            "User violated community guidelines with repeated violations",
          appeal_eligible_at: new Date(
            pastDate.getTime() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban1);

  const ban2: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member2.id,
          community_platform_report_decision_id: decision2.id,
          ban_reason:
            "User engaged in harassment and abusive behavior patterns",
          appeal_eligible_at: new Date(
            recentDate.getTime() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban2);

  const ban3: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member3.id,
          community_platform_report_decision_id: decision3.id,
          ban_reason:
            "User posted prohibited content multiple times without warning",
          appeal_eligible_at: new Date(
            recentDate.getTime() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban3);

  // Step 9: Test searching bans with date range filters
  // Test 1: Filter bans issued after a specific date (ban_date_from)
  const banDateFrom = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const resultAfter: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          ban_date_from: banDateFrom.toISOString(),
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(resultAfter);
  TestValidator.predicate(
    "results should contain bans from after the specified date",
    resultAfter.data.length > 0,
  );

  // Test 2: Filter bans issued before a specific date (ban_date_to)
  const banDateTo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const resultBefore: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          ban_date_to: banDateTo.toISOString(),
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(resultBefore);

  // Test 3: Filter bans within a specific date range
  const rangeStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const resultRange: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          ban_date_from: rangeStart.toISOString(),
          ban_date_to: rangeEnd.toISOString(),
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(resultRange);

  // Step 10: Verify results meet the date range criteria
  for (const ban of resultRange.data) {
    const banDate = new Date(ban.banned_at);
    TestValidator.predicate(
      "ban date should be after range start",
      banDate >= rangeStart,
    );
    TestValidator.predicate(
      "ban date should be before range end",
      banDate <= rangeEnd,
    );
  }

  // Step 11: Test edge cases - bans at exact boundary timestamps
  const boundaryStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const boundaryEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const resultBoundary: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          ban_date_from: boundaryStart.toISOString(),
          ban_date_to: boundaryEnd.toISOString(),
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(resultBoundary);

  // Step 12: Verify ISO 8601 UTC format handling
  TestValidator.predicate(
    "all ban dates should be in valid ISO 8601 format",
    resultBoundary.data.every((ban) => {
      const dateStr = ban.banned_at;
      // Check if it matches ISO 8601 UTC format
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(dateStr);
    }),
  );

  // Step 13: Verify pagination information
  TestValidator.predicate(
    "pagination should include current page",
    resultRange.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should include limit",
    resultRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should include total records",
    resultRange.pagination.records >= 0,
  );

  // Step 14: Verify sorting consistency
  TestValidator.predicate(
    "results should have consistent structure",
    resultRange.data.every((ban) => ban.id && ban.ban_reason && ban.banned_at),
  );
}
