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

/**
 * Test filtering member bans by appeal eligibility status to identify which
 * banned members can submit appeals.
 *
 * Scenario: Creates multiple bans with different appeal eligibility windows and
 * tests filtering by appeal eligibility: (1) Creating bans with
 * appeal_eligible_at in the future (not eligible to appeal yet) (2) Creating
 * bans with appeal_eligible_at in the past (eligible to appeal now) (3)
 * Creating bans with null appeal_eligible_at (permanent non-appealable bans)
 * (4) Filtering by appeal_eligible=true to find currently appealable bans (5)
 * Filtering by appeal_eligible=false to find non-appealable permanent bans (6)
 * Filtering by appeal_eligible=null to retrieve all bans (7) Verifying correct
 * bans are returned for each filter state (8) Confirming timestamps are
 * properly formatted in ISO 8601 UTC
 */
export async function test_api_member_bans_search_filter_by_appeal_eligibility(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account for moderation operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      username: RandomGenerator.alphabets(8),
      href: "https://example.com/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create first member account and community setup
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail1,
      username: RandomGenerator.alphabets(8),
      password: "MemberPassword123!",
      href: "https://example.com/member1",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 5: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create a post
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph(),
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  // Step 7: Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Create moderation decision for ban with past appeal eligibility
  const decision1 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "ban_user",
          reason:
            "Member violated community guidelines with sufficient time elapsed for appeal consideration",
          internal_notes:
            "Violation detected for ban with appeal eligibility in past",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  // Step 9: Create ban with past appeal eligibility (currently appealable)
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ban1 =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member1.id,
          community_platform_report_decision_id: decision1.id,
          ban_reason:
            "Community guideline violation with sufficient time elapsed for appeal consideration and review",
          appeal_eligible_at: pastDate.toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban1);

  // Step 10: Create second member and post for future appeal eligibility ban
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail2,
      username: RandomGenerator.alphabets(8),
      password: "Member2Password123!",
      href: "https://example.com/member2",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 11: Create moderation decision for ban with future appeal eligibility
  const decision2 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "ban_user",
          reason:
            "Member violated community policies and waiting period for appeal has not elapsed yet",
          internal_notes:
            "Violation detected for ban with appeal eligibility in future",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // Step 12: Create ban with future appeal eligibility (not yet appealable)
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ban2 =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member2.id,
          community_platform_report_decision_id: decision2.id,
          ban_reason:
            "Member violated community policies and waiting period for appeal has not elapsed yet",
          appeal_eligible_at: futureDate.toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban2);

  // Step 13: Create third member for permanent non-appealable ban
  const memberEmail3 = typia.random<string & tags.Format<"email">>();
  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail3,
      username: RandomGenerator.alphabets(8),
      password: "Member3Password123!",
      href: "https://example.com/member3",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member3);

  // Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 14: Create moderation decision for permanent non-appealable ban
  const decision3 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "ban_user",
          reason:
            "Member violated severe community policies with permanent consequence and no appeal option",
          internal_notes:
            "Severe violation detected for permanent non-appealable ban",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision3);

  // Step 15: Create permanent non-appealable ban (null appeal_eligible_at)
  const ban3 =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member3.id,
          community_platform_report_decision_id: decision3.id,
          ban_reason:
            "Permanent ban for severe violations with no appeal eligibility whatsoever",
          appeal_eligible_at: null,
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban3);

  // Step 16: Test filtering by appeal_eligible=true (currently appealable bans)
  const appealableResult =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          appeal_eligible: true,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(appealableResult);
  TestValidator.predicate(
    "appealable bans should be returned when filtering by appeal_eligible=true",
    appealableResult.data.length > 0,
  );

  // Verify all returned bans have past or current appeal_eligible_at dates
  for (const ban of appealableResult.data) {
    if (ban.appeal_eligible_at) {
      const eligibleDate = new Date(ban.appeal_eligible_at);
      TestValidator.predicate(
        "appeal_eligible_at should be in the past for appealable bans",
        eligibleDate <= now,
      );
    }
  }

  // Step 17: Test filtering by appeal_eligible=false (non-appealable bans)
  const nonAppealableResult =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          appeal_eligible: false,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(nonAppealableResult);
  TestValidator.predicate(
    "non-appealable bans should be returned when filtering by appeal_eligible=false",
    nonAppealableResult.data.length > 0,
  );

  // Verify returned bans have null or future appeal_eligible_at dates
  for (const ban of nonAppealableResult.data) {
    if (ban.appeal_eligible_at) {
      const eligibleDate = new Date(ban.appeal_eligible_at);
      TestValidator.predicate(
        "appeal_eligible_at should be in the future for non-appealable bans",
        eligibleDate > now,
      );
    }
  }

  // Step 18: Test filtering by appeal_eligible=null (all bans)
  const allBansResult =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          appeal_eligible: null,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(allBansResult);
  TestValidator.predicate(
    "all bans should be returned when filtering by appeal_eligible=null",
    allBansResult.data.length >= 3,
  );

  // Step 19: Verify timestamps are properly formatted in ISO 8601 UTC
  for (const ban of allBansResult.data) {
    TestValidator.predicate(
      "banned_at should be a valid ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ban.banned_at),
    );

    if (ban.appeal_eligible_at) {
      TestValidator.predicate(
        "appeal_eligible_at should be a valid ISO 8601 datetime",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ban.appeal_eligible_at),
      );
    }

    TestValidator.predicate(
      "created_at should be a valid ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ban.created_at),
    );

    TestValidator.predicate(
      "updated_at should be a valid ISO 8601 datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ban.updated_at),
    );
  }

  // Step 20: Verify pagination information is correct
  TestValidator.predicate(
    "pagination current page should be valid",
    allBansResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    allBansResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    allBansResult.pagination.records >= allBansResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    allBansResult.pagination.pages > 0,
  );
}
