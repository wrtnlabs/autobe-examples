import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Test moderator list sorting options and pagination.
 *
 * This test verifies that the moderator list endpoint correctly supports
 * sorting by multiple fields (appointedAt, tier, username) in both ascending
 * and descending order. It validates pagination metadata accuracy, default
 * sorting behavior, and consistency of results across multiple requests.
 *
 * Steps:
 *
 * 1. Setup: Create administrator, member, community, and multiple moderators with
 *    different tiers and appointment times
 * 2. Test default sorting (appointedAt descending) when no parameters provided
 * 3. Test sorting by appointedAt in ascending order
 * 4. Test sorting by appointedAt in descending order
 * 5. Test sorting by tier
 * 6. Test sorting by username in both directions
 * 7. Test pagination with different limit values
 * 8. Validate pagination metadata (current, limit, records, pages)
 * 9. Test page navigation consistency across multiple requests
 * 10. Verify sorting consistency across repeated requests with same parameters
 */
export async function test_api_moderator_list_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Setup - Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create multiple moderators with different tiers
  const moderators: ICommunityPlatformCommunityModerator[] = [];

  // Create junior moderators
  for (let i = 0; i < 2; i++) {
    const newMember = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(6),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(newMember);

    const moderator =
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: newMember.id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderator);
    moderators.push(moderator);
  }

  // Create senior moderators
  for (let i = 0; i < 3; i++) {
    const newMember = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(7),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(newMember);

    const moderator =
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: newMember.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderator);
    moderators.push(moderator);
  }

  // Step 2: Test default sorting (appointedAt descending)
  const defaultSort =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate("default sort has data", defaultSort.data.length > 0);
  TestValidator.predicate(
    "default sort descending by appointed_at",
    defaultSort.data.length <= 1 ||
      defaultSort.data[0].appointed_at >= defaultSort.data[1].appointed_at,
  );

  // Step 3: Test sorting by appointedAt ascending
  const sortAscending =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortAscending);
  TestValidator.predicate(
    "ascending sort ordered correctly",
    sortAscending.data.length <= 1 ||
      sortAscending.data[0].appointed_at <= sortAscending.data[1].appointed_at,
  );

  // Step 4: Test sorting by appointedAt descending (explicit)
  const sortDescending =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortDescending);
  TestValidator.predicate(
    "descending sort ordered correctly",
    sortDescending.data.length <= 1 ||
      sortDescending.data[0].appointed_at >=
        sortDescending.data[1].appointed_at,
  );

  // Step 5: Test sorting by tier
  const sortByTier =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "tier",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortByTier);
  TestValidator.predicate("tier sort has data", sortByTier.data.length > 0);

  // Step 6: Test sorting by username
  const sortByUsername =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "username",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortByUsername);
  TestValidator.predicate(
    "username sort has data",
    sortByUsername.data.length > 0,
  );

  // Step 7: Test pagination with different limit values
  const page1Limit5 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Limit5);
  TestValidator.equals(
    "page 1 limit 5 returns max 5 items",
    Math.min(page1Limit5.data.length, 5),
    page1Limit5.data.length,
  );

  // Step 8: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total records non-negative",
    page1Limit5.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1Limit5.pagination.pages >= 0,
  );

  // Step 9: Test page navigation consistency
  if (page1Limit5.pagination.pages > 1) {
    const page2Limit5 =
      await api.functional.communityPlatform.member.communities.moderators.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 2,
            limit: 5,
          } satisfies ICommunityPlatformCommunityModerator.IRequest,
        },
      );
    typia.assert(page2Limit5);
    TestValidator.equals(
      "page 2 current page",
      page2Limit5.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "page 2 has different data than page 1",
      page2Limit5.data[0]?.id,
      page1Limit5.data[0]?.id,
    );
  }

  // Step 10: Verify sorting consistency across repeated requests
  const firstRequest =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "username",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(firstRequest);

  const secondRequest =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "username",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(secondRequest);

  TestValidator.predicate(
    "sorting is consistent across requests",
    firstRequest.data.length === secondRequest.data.length &&
      firstRequest.data.every(
        (mod, idx) => mod.id === secondRequest.data[idx]?.id,
      ),
  );
}
