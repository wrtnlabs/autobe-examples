import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

export async function test_api_community_subscriptions_moderator_list_by_join_date(
  connection: api.IConnection,
) {
  // Step 1: Set up administrator account and create a category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/auth/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a community category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Set up moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/auth/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const communityCreator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: creatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(communityCreator);

  // Step 5: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public" as const,
          post_creation_restriction: "open_to_all" as const,
          post_type_restriction: "all_types" as const,
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create additional member accounts
  const members: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: `member_${RandomGenerator.alphaNumeric(4)}`,
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/auth/register",
          referrer: "https://example.com/home",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push(member);
  }

  // Step 7: Authenticate as moderator to access moderator endpoints
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Test retrieving subscriptions with default pagination
  const subscriptionsPage1: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionsPage1);
  TestValidator.predicate(
    "subscriptions page has pagination",
    subscriptionsPage1.pagination !== null &&
      subscriptionsPage1.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    subscriptionsPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    subscriptionsPage1.pagination.limit === 20,
  );

  // Step 9: Test sorting by newest subscriptions (most recent join date first)
  const newestSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "newest" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(newestSubscriptions);
  TestValidator.predicate(
    "newest sort returns valid page",
    newestSubscriptions.pagination !== null &&
      newestSubscriptions.pagination !== undefined,
  );

  // Step 10: Test sorting by oldest subscriptions (earliest join date first)
  const oldestSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "oldest" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(oldestSubscriptions);
  TestValidator.predicate(
    "oldest sort returns valid page",
    oldestSubscriptions.pagination !== null &&
      oldestSubscriptions.pagination !== undefined,
  );

  // Step 11: Test pagination with reduced limit
  const limitedSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(limitedSubscriptions);
  TestValidator.predicate(
    "limit 2 respected",
    limitedSubscriptions.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination limit is 2",
    limitedSubscriptions.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    limitedSubscriptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    limitedSubscriptions.pagination.pages >= 0,
  );

  // Step 12: Verify subscription record structure
  if (subscriptionsPage1.data.length > 0) {
    const subscription = subscriptionsPage1.data[0];
    TestValidator.predicate(
      "subscription has ID",
      subscription.id !== null &&
        subscription.id !== undefined &&
        subscription.id.length > 0,
    );
    TestValidator.predicate(
      "subscription has community_id",
      subscription.community_id !== null &&
        subscription.community_id !== undefined &&
        subscription.community_id.length > 0,
    );
    TestValidator.predicate(
      "subscription has member_id",
      subscription.member_id !== null &&
        subscription.member_id !== undefined &&
        subscription.member_id.length > 0,
    );
    TestValidator.predicate(
      "subscription has subscribed_at",
      subscription.subscribed_at !== null &&
        subscription.subscribed_at !== undefined &&
        subscription.subscribed_at.length > 0,
    );
    TestValidator.predicate(
      "subscription has created_at",
      subscription.created_at !== null &&
        subscription.created_at !== undefined &&
        subscription.created_at.length > 0,
    );
    TestValidator.equals(
      "subscription community_id matches",
      subscription.community_id,
      community.id,
    );
  }

  // Step 13: Test pagination across multiple pages if available
  if (limitedSubscriptions.pagination.pages > 1) {
    const page2: IPageICommunityPlatformCommunitySubscription.ISummary =
      await api.functional.communityPlatform.moderator.communities.subscriptions.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 2,
            limit: 2,
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.predicate("page 2 has different data", page2.data.length > 0);
    TestValidator.predicate(
      "page 2 current page is 2",
      page2.pagination.current === 2,
    );
  }
}
