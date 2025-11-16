import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

export async function test_api_community_ban_search_invalid_pagination_limit(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: administratorEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
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
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a community by member (need to authenticate as member first)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Test invalid pagination limit = 0 (below minimum)
  await TestValidator.error(
    "should reject limit=0 (below minimum of 1)",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 1,
            limit: 0,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    },
  );

  // Step 7: Test invalid pagination limit = 101 (above maximum)
  await TestValidator.error(
    "should reject limit=101 (above maximum of 100)",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 1,
            limit: 101,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    },
  );

  // Step 8: Test invalid pagination limit = -5 (negative value)
  await TestValidator.error(
    "should reject limit=-5 (negative value)",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 1,
            limit: -5,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    },
  );

  // Step 9: Verify valid limit values work (boundary testing)
  const validResult1 =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(validResult1);
  TestValidator.equals(
    "pagination limit=1 should be accepted",
    validResult1.pagination.limit,
    1,
  );

  const validResult2 =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(validResult2);
  TestValidator.equals(
    "pagination limit=100 should be accepted",
    validResult2.pagination.limit,
    100,
  );
}
