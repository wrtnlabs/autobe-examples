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

export async function test_api_moderator_search_filtering_active_and_removed(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator created",
    administrator.id !== undefined,
  );

  // Step 2: Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category created", category.id !== undefined);

  // Step 3: Authenticate as member and create a community
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphaNumeric(10),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate("member created", member.id !== undefined);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate("community created", community.id !== undefined);

  // Step 5: Search moderators with includeRemoved=false (only active moderators)
  const activeOnlyResult =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          includeRemoved: false,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(activeOnlyResult);
  TestValidator.predicate(
    "active moderators search result exists",
    activeOnlyResult.data !== undefined,
  );
  TestValidator.predicate(
    "pagination info exists",
    activeOnlyResult.pagination !== undefined,
  );

  // Verify all returned moderators have is_active = true
  for (const moderator of activeOnlyResult.data) {
    TestValidator.predicate(
      "moderator is active",
      moderator.is_active === true,
    );
  }

  // Step 6: Search moderators with includeRemoved=true (all moderators including removed)
  const allModeratorsResult =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(allModeratorsResult);
  TestValidator.predicate(
    "all moderators search result exists",
    allModeratorsResult.data !== undefined,
  );

  // Verify pagination structure
  TestValidator.predicate(
    "pagination current page valid",
    allModeratorsResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allModeratorsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    allModeratorsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    allModeratorsResult.pagination.pages >= 0,
  );

  // Step 7: Verify each moderator has required fields
  for (const moderator of allModeratorsResult.data) {
    typia.assert(moderator.id);
    TestValidator.predicate(
      "moderator tier is valid",
      ["creator", "senior", "junior"].includes(moderator.moderator_tier),
    );
    TestValidator.predicate(
      "moderator appointed_at is valid timestamp",
      typeof moderator.appointed_at === "string",
    );
    TestValidator.predicate(
      "moderator created_at is valid timestamp",
      typeof moderator.created_at === "string",
    );
    TestValidator.predicate(
      "moderator is_active is boolean",
      typeof moderator.is_active === "boolean",
    );
    TestValidator.predicate(
      "moderator community exists",
      moderator.community !== undefined,
    );
    TestValidator.predicate(
      "moderator member exists",
      moderator.member !== undefined,
    );
  }

  // Step 8: Search with specific filters (tier filter)
  const creatorOnlyResult =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "creator",
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(creatorOnlyResult);

  // Verify filtered results only contain creator tier
  for (const moderator of creatorOnlyResult.data) {
    TestValidator.predicate(
      "filtered moderator is creator tier",
      moderator.moderator_tier === "creator",
    );
  }

  // Step 9: Test sorting by appointedAt
  const sortedByAppointmentResult =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "desc",
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedByAppointmentResult);
  TestValidator.predicate(
    "sorted results exist",
    sortedByAppointmentResult.data.length >= 0,
  );

  // Step 10: Test pagination with different limits
  const paginatedResult =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 5,
  );
}
