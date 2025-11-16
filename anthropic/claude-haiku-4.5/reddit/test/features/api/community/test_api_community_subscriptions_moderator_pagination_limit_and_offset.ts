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

/**
 * Test pagination functionality when retrieving community subscriptions.
 *
 * Validates that moderators can retrieve community subscriptions with
 * configurable pagination parameters. Tests various limit values, page
 * navigation, and pagination metadata accuracy. The moderator is the community
 * creator and has full access to query subscriptions.
 *
 * Test workflow:
 *
 * 1. Administrator creates a category
 * 2. Create moderator account (will be community creator)
 * 3. Moderator creates a community
 * 4. Create multiple member accounts
 * 5. Test default pagination (limit=20, page=1)
 * 6. Test custom limit values (10, 50, 100)
 * 7. Test page navigation through pages
 * 8. Validate pagination metadata accuracy
 * 9. Test requesting beyond available pages
 * 10. Verify subscription data structure
 */
export async function test_api_community_subscriptions_moderator_pagination_limit_and_offset(
  connection: api.IConnection,
) {
  // Step 1: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create admin account for category and initial setup
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(),
        href: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create moderator account (will be community creator and have admin access)
  const moderatorEmail = `mod-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModPass123!",
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Login as moderator for community creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPass123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Create community (moderator auto-subscribed as creator)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create multiple member accounts to potentially increase subscriptions
  const memberCount = 25;
  for (let i = 0; i < memberCount; i++) {
    const memberEmail = `member_${i}-${RandomGenerator.alphaNumeric(6)}@test.com`;
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          password: "MemberPass123!",
          username: `member_${RandomGenerator.alphaNumeric(8)}`,
          href: "https://example.com",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
  }

  // Step 7: Relogin as moderator to query subscriptions (moderator is creator with full access)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPass123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Test default pagination (page 1, limit 20)
  const defaultPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(defaultPage);

  TestValidator.equals(
    "default pagination current page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit should be 20",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default pagination records count should be at least 1",
    defaultPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "default pagination data length should not exceed limit",
    defaultPage.data.length <= 20,
  );

  // Step 9: Test custom limit value (limit 10)
  const limitTen: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(limitTen);

  TestValidator.equals(
    "limit 10 pagination limit should be 10",
    limitTen.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "limit 10 data length should be at most 10",
    limitTen.data.length <= 10,
  );

  // Step 10: Test higher limit value (limit 50)
  const limitFifty: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          limit: 50,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(limitFifty);

  TestValidator.equals(
    "limit 50 pagination limit should be 50",
    limitFifty.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "limit 50 data length should match pagination limit",
    limitFifty.data.length <= limitFifty.pagination.limit,
  );

  // Step 11: Test maximum limit value (limit 100)
  const limitMax: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          limit: 100,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(limitMax);

  TestValidator.equals(
    "limit 100 pagination limit should be 100",
    limitMax.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 data length should not exceed limit",
    limitMax.data.length <= 100,
  );

  // Step 12: Test page navigation (if records exist)
  if (defaultPage.pagination.records > 10) {
    const page2: IPageICommunityPlatformCommunitySubscription.ISummary =
      await api.functional.communityPlatform.moderator.communities.subscriptions.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert(page2);

    TestValidator.equals(
      "page 2 current page should be 2",
      page2.pagination.current,
      2,
    );
  }

  // Step 13: Test pagination metadata consistency
  TestValidator.predicate(
    "pagination pages calculation should be correct",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );

  // Step 14: Test requesting page beyond available pages
  const beyondPages: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(beyondPages);

  TestValidator.equals(
    "beyond available pages should return empty data array",
    beyondPages.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond pages pagination records should still show total count",
    beyondPages.pagination.records >= 0,
  );

  // Step 15: Verify subscription data structure when records exist
  if (defaultPage.data.length > 0) {
    const firstSub = defaultPage.data[0];
    TestValidator.predicate(
      "subscription should have valid UUID id",
      firstSub.id.length === 36,
    );
    TestValidator.equals(
      "subscription community_id should match queried community",
      firstSub.community_id,
      community.id,
    );
    TestValidator.predicate(
      "subscription should have valid UUID member_id",
      firstSub.member_id.length === 36,
    );
    TestValidator.predicate(
      "subscription should have subscribed_at timestamp",
      firstSub.subscribed_at.length > 0,
    );
    TestValidator.predicate(
      "subscription should have created_at timestamp",
      firstSub.created_at.length > 0,
    );
  }

  // Step 16: Verify all limit values correctly applied
  TestValidator.predicate(
    "all pagination limit values should be correct",
    defaultPage.pagination.limit === 20 &&
      limitTen.pagination.limit === 10 &&
      limitFifty.pagination.limit === 50 &&
      limitMax.pagination.limit === 100,
  );

  // Step 17: Verify records count is consistent across requests
  TestValidator.equals(
    "records count should be consistent across pagination requests",
    defaultPage.pagination.records,
    limitTen.pagination.records,
  );
}
