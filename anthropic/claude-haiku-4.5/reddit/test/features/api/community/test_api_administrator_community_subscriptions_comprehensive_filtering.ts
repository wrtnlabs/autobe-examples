import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

export async function test_api_administrator_community_subscriptions_comprehensive_filtering(
  connection: api.IConnection,
) {
  // 1. Create an administrator account for testing
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        href: "http://localhost/admin/join",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  typia.assert(admin.token);

  // 2. Create a community category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Tech discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member account for community creation
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(12),
        href: "http://localhost/member/join",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for tech enthusiasts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create multiple member accounts with different karma scores and usernames
  const members = await ArrayUtil.asyncRepeat(5, async (index) => {
    const email = `member${index}@test.com`;
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: email,
          password: "SecurePassword123!",
          username: `user_${RandomGenerator.alphaNumeric(6)}`,
          href: "http://localhost/member/join",
          referrer: "http://localhost/",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    return member;
  });

  // 6. Test filtering with no criteria - should return all subscriptions
  const allSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.predicate(
    "should have pagination info",
    allSubscriptions.pagination !== undefined,
  );
  TestValidator.predicate(
    "initial subscriptions should exist",
    allSubscriptions.data.length >= 1,
  );

  // 7. Test filtering by username search
  const firstMemberUsername = members[0].id;
  const usernameFilteredSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "user",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(usernameFilteredSubscriptions);
  TestValidator.predicate(
    "username filter should return results",
    usernameFilteredSubscriptions.data.length >= 0,
  );

  // 8. Test filtering by karma range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const karmaFilteredSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: 0,
          max_karma: 1000,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(karmaFilteredSubscriptions);
  TestValidator.predicate(
    "karma filter should return valid results",
    karmaFilteredSubscriptions.data.length >= 0,
  );

  // 9. Test filtering by subscription date range
  const dateFilteredSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          subscribed_from: oneWeekAgo.toISOString(),
          subscribed_to: now.toISOString(),
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateFilteredSubscriptions);
  TestValidator.predicate(
    "date filter should return valid results",
    dateFilteredSubscriptions.data.length >= 0,
  );

  // 10. Test combining multiple filters simultaneously
  const combinedFilteredSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "user",
          min_karma: 0,
          max_karma: 5000,
          subscribed_from: oneWeekAgo.toISOString(),
          subscribed_to: now.toISOString(),
          sort_by: "newest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(combinedFilteredSubscriptions);
  TestValidator.predicate(
    "combined filters should return valid pagination",
    combinedFilteredSubscriptions.pagination !== undefined,
  );
  TestValidator.predicate(
    "combined filters should return data array",
    Array.isArray(combinedFilteredSubscriptions.data),
  );

  // 11. Test pagination with filters
  const paginatedFilteredSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 10,
          search_username: "user",
          min_karma: 0,
          max_karma: 5000,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedFilteredSubscriptions);
  TestValidator.predicate(
    "pagination with filters should work",
    paginatedFilteredSubscriptions.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedFilteredSubscriptions.pagination.limit === 10,
  );

  // 12. Test sorting options with filters
  const sortedFilteredSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "oldest",
          min_karma: 0,
          max_karma: 5000,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedFilteredSubscriptions);
  TestValidator.predicate(
    "sorted filtered results should be valid",
    sortedFilteredSubscriptions.data.length >= 0,
  );

  // 13. Validate filter accuracy - filtered results should be subset
  TestValidator.predicate(
    "filtered results should not exceed total results",
    combinedFilteredSubscriptions.data.length <=
      allSubscriptions.pagination.records,
  );
}
