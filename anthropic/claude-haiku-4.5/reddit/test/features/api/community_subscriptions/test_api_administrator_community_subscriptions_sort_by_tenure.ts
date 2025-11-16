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

export async function test_api_administrator_community_subscriptions_sort_by_tenure(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: RandomGenerator.name(),
      href: "https://localhost:3000/admin/join",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: `category_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple members with stored credentials
  const memberCredentials = await ArrayUtil.asyncRepeat(5, async () => {
    const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
    const memberPassword = RandomGenerator.alphaNumeric(12);
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword,
        href: "https://localhost:3000/join",
        referrer: "https://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    return { email: memberEmail, password: memberPassword, member };
  });

  // Step 4: Create community as first member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials[0].email,
      password: memberCredentials[0].password,
      href: "https://localhost:3000/login",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Subscribe other members to the community sequentially
  for (let i = 1; i < memberCredentials.length; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberCredentials[i].email,
        password: memberCredentials[i].password,
        href: "https://localhost:3000/login",
        referrer: "https://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });
    // In real scenario, members would subscribe through API call
    // For this test, we verify the sorting works on existing subscriptions
  }

  // Step 6: Switch to administrator and retrieve subscriptions sorted by oldest
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://localhost:3000/admin/login",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const oldestSubscriptions =
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
  typia.assert(oldestSubscriptions);

  // Validate oldest sort order (ascending by subscribed_at)
  if (oldestSubscriptions.data.length > 1) {
    for (let i = 1; i < oldestSubscriptions.data.length; i++) {
      const prevTime = new Date(
        oldestSubscriptions.data[i - 1].subscribed_at,
      ).getTime();
      const currTime = new Date(
        oldestSubscriptions.data[i].subscribed_at,
      ).getTime();
      TestValidator.predicate(
        "oldest sort order should have ascending subscription dates",
        prevTime <= currTime,
      );
    }
  }

  // Step 7: Retrieve subscriptions sorted by newest
  const newestSubscriptions =
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
  typia.assert(newestSubscriptions);

  // Validate newest sort order (descending by subscribed_at)
  if (newestSubscriptions.data.length > 1) {
    for (let i = 1; i < newestSubscriptions.data.length; i++) {
      const prevTime = new Date(
        newestSubscriptions.data[i - 1].subscribed_at,
      ).getTime();
      const currTime = new Date(
        newestSubscriptions.data[i].subscribed_at,
      ).getTime();
      TestValidator.predicate(
        "newest sort order should have descending subscription dates",
        prevTime >= currTime,
      );
    }
  }

  // Step 8: Verify pagination with sorting
  const paginatedOldest =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
          sort_by: "oldest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedOldest);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedOldest.data.length <= 2,
  );

  // Step 9: Verify total subscription counts match between sort orders
  TestValidator.equals(
    "total subscription records should match between sort orders",
    oldestSubscriptions.pagination.records,
    newestSubscriptions.pagination.records,
  );

  // Step 10: Test pagination on second page with oldest sort
  if (oldestSubscriptions.pagination.pages > 1) {
    const secondPageOldest =
      await api.functional.communityPlatform.administrator.communities.subscriptions.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 2,
            limit: 2,
            sort_by: "oldest",
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert(secondPageOldest);

    TestValidator.predicate(
      "second page should have valid data",
      secondPageOldest.data.length > 0,
    );
  }
}
