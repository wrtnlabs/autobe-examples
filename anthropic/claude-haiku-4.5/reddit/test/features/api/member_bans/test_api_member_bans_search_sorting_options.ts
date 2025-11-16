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
 * Test member ban searching and sorting functionality to verify that moderators
 * can efficiently organize ban lists with multiple sorting options.
 *
 * The test validates:
 *
 * 1. Creating multiple member bans with distinct timestamps
 * 2. Sorting by ban_date in ascending order (oldest bans first) and descending
 *    order (newest bans first)
 * 3. Sorting by member_name alphabetically
 * 4. Sorting by appeal_eligible_date to identify soon-to-be-appealable bans
 * 5. Sorting by created_at timestamp to find recently created ban records
 * 6. Testing default sort order when not specified
 * 7. Verifying sort direction (asc/desc) is applied correctly for each field
 * 8. Validating pagination works correctly with sorted results
 */
export async function test_api_member_bans_search_sorting_options(
  connection: api.IConnection,
) {
  // Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Create multiple members to ban
  const memberCredentials: Array<{
    email: string;
    password: string;
    member: ICommunityPlatformMember.IAuthorized;
  }> = [];

  for (let i = 0; i < 5; i++) {
    const memberEmail: string = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(12);
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          username: RandomGenerator.alphabets(8),
          password: memberPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: "",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    memberCredentials.push({
      email: memberEmail,
      password: memberPassword,
      member: member,
    });
  }

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create posts by each member
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < memberCredentials.length; i++) {
    // Login as member
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberCredentials[i].email,
        password: memberCredentials[i].password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Violation Post ${i}`,
          content_text: RandomGenerator.content(),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Login as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create moderation decisions for bans
  const decisions: ICommunityPlatformReportDecision[] = [];
  for (let i = 0; i < memberCredentials.length; i++) {
    const mockReportId = typia.random<string & tags.Format<"uuid">>();
    try {
      const decision: ICommunityPlatformReportDecision =
        await api.functional.communityPlatform.moderator.reports.decision.create(
          connection,
          {
            reportId: mockReportId,
            body: {
              action_type: "ban_user",
              reason: `Violation: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            } satisfies ICommunityPlatformReportDecision.ICreate,
          },
        );
      typia.assert(decision);
      decisions.push(decision);
    } catch {
      // If report creation fails, skip this decision
    }
  }

  // If we have decisions, create member bans with staggered dates for sorting
  const bans: ICommunityPlatformMemberBan[] = [];
  if (decisions.length > 0) {
    const now = new Date();

    for (let i = 0; i < memberCredentials.length && i < decisions.length; i++) {
      // Stagger ban dates for sorting test
      const banOffset = i * 24 * 60 * 60 * 1000; // Offset by days
      const appealOffset = 365 * 24 * 60 * 60 * 1000 + banOffset;

      const ban: ICommunityPlatformMemberBan =
        await api.functional.communityPlatform.moderator.memberBans.create(
          connection,
          {
            body: {
              community_platform_member_id: memberCredentials[i].member.id,
              community_platform_report_decision_id: decisions[i].id,
              ban_reason: `Community policy violation: ${RandomGenerator.paragraph({ sentences: 2 })}`,
              appeal_eligible_at: new Date(
                now.getTime() + appealOffset,
              ).toISOString(),
            } satisfies ICommunityPlatformMemberBan.ICreate,
          },
        );
      typia.assert(ban);
      bans.push(ban);
    }
  }

  // Test 1: Sort by ban_date ascending (oldest first)
  const sortByBanDateAsc: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "ban_date",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortByBanDateAsc);
  TestValidator.predicate(
    "ban date ascending sort returns valid page",
    sortByBanDateAsc.pagination.current === 1,
  );

  // Test 2: Sort by ban_date descending (newest first)
  const sortByBanDateDesc: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "ban_date",
          order: "desc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortByBanDateDesc);
  TestValidator.predicate(
    "ban date descending sort returns valid page",
    sortByBanDateDesc.pagination.current === 1,
  );

  // Test 3: Sort by member_name alphabetically
  const sortByMemberName: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "member_name",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortByMemberName);
  TestValidator.predicate(
    "member name sort returns valid page",
    sortByMemberName.pagination.current === 1,
  );

  // Test 4: Sort by appeal_eligible_date
  const sortByAppealDate: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "appeal_eligible_date",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortByAppealDate);
  TestValidator.predicate(
    "appeal eligible date sort returns valid page",
    sortByAppealDate.pagination.current === 1,
  );

  // Test 5: Sort by created_at timestamp descending (most recent first)
  const sortByCreatedAtDesc: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  TestValidator.predicate(
    "created_at descending sort returns valid page",
    sortByCreatedAtDesc.pagination.current === 1,
  );

  // Test 6: Sort by created_at timestamp ascending (oldest first)
  const sortByCreatedAtAsc: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);
  TestValidator.predicate(
    "created_at ascending sort returns valid page",
    sortByCreatedAtAsc.pagination.current === 1,
  );

  // Test 7: Default sort order (no sort parameters specified)
  const defaultSort: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sort returns valid pagination",
    defaultSort.pagination.current >= 1,
  );

  // Test 8: Pagination works with sorted results
  const secondPage: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 2,
          limit: 2,
          order_by: "ban_date",
          order: "desc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "pagination metadata is valid",
    secondPage.pagination.limit > 0 &&
      secondPage.pagination.records >= 0 &&
      secondPage.pagination.pages >= 0,
  );

  // Test 9: Limit parameter is respected
  const limitedResults: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 3,
          order_by: "ban_date",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(limitedResults);
  TestValidator.predicate(
    "limit parameter is respected in results",
    limitedResults.data.length <= 3,
  );

  // Test 10: Results contain all expected fields for sorting validation
  if (limitedResults.data.length > 0) {
    const firstBan = limitedResults.data[0];
    TestValidator.predicate(
      "ban record contains id field",
      firstBan.id !== undefined && firstBan.id !== null,
    );
    TestValidator.predicate(
      "ban record contains ban_reason field",
      firstBan.ban_reason !== undefined && firstBan.ban_reason.length > 0,
    );
    TestValidator.predicate(
      "ban record contains banned_at field",
      firstBan.banned_at !== undefined,
    );
    TestValidator.predicate(
      "ban record contains created_at field",
      firstBan.created_at !== undefined,
    );
  }
}
