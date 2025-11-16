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

export async function test_api_administrator_community_subscriptions_karma_analysis(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphabets(5).toLowerCase()}`,
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member accounts
  const memberCredentials: Array<{ email: string; password: string }> = [];

  for (let i = 0; i < 3; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphabets(12);
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user_${RandomGenerator.alphabets(8).toLowerCase()}`,
        password: memberPassword,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    memberCredentials.push({ email: memberEmail, password: memberPassword });
  }

  // 4. Create a community with the first member
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.member.login(memberConnection, {
    body: {
      email: memberCredentials[0].email,
      password: memberCredentials[0].password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "Tech Community",
          identifier: `tech_community_${RandomGenerator.alphabets(5).toLowerCase()}`,
          description: "A community for tech enthusiasts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Switch to administrator and retrieve subscriptions with karma filtering
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Test 1: Retrieve all subscriptions with pagination
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
    "subscriptions list is not empty",
    allSubscriptions.data.length > 0,
  );

  // Test 2: Validate pagination structure
  TestValidator.predicate(
    "pagination current page is positive",
    allSubscriptions.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit value",
    allSubscriptions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records count",
    allSubscriptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    allSubscriptions.pagination.pages >= 0,
  );

  // Test 3: Filter by minimum karma to find experienced members
  const experiencedMembers: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: 100,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(experiencedMembers);

  // Test 4: Filter by maximum karma to find newer members
  const newMembers: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          max_karma: 50,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(newMembers);

  // Test 5: Filter by karma range
  const midLevelMembers: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: 50,
          max_karma: 150,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(midLevelMembers);

  // Test 6: Search by username
  const usernameSearch: IPageICommunityPlatformCommunitySubscription.ISummary =
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
  typia.assert(usernameSearch);

  // Test 7: Sorting by newest subscriptions
  const newestMembers: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "newest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(newestMembers);

  // Test 8: Sorting by oldest subscriptions
  const oldestMembers: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "oldest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(oldestMembers);

  // Validate individual subscription data structure
  if (allSubscriptions.data.length > 0) {
    const firstSubscription = allSubscriptions.data[0];
    TestValidator.predicate(
      "subscription has valid id",
      firstSubscription.id !== undefined && firstSubscription.id !== "",
    );
    TestValidator.equals(
      "subscription community_id matches community",
      firstSubscription.community_id,
      community.id,
    );
    TestValidator.predicate(
      "subscription has member_id",
      firstSubscription.member_id !== undefined &&
        firstSubscription.member_id !== "",
    );
    TestValidator.predicate(
      "subscription has subscribed_at timestamp",
      firstSubscription.subscribed_at !== undefined,
    );
    TestValidator.predicate(
      "subscription has created_at timestamp",
      firstSubscription.created_at !== undefined,
    );
  }
}
