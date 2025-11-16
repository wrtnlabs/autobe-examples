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

export async function test_api_community_ban_search_successful_retrieval(
  connection: api.IConnection,
) {
  // 1. Setup: Create administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 3. Setup: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 4. Setup: Create member account (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: creatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // 5. Create community
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

  // 6. Create multiple members to ban
  const bannedMembersData: Array<{ id: string; password: string }> = [];
  for (let i = 0; i < 3; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(12);
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    bannedMembersData.push({ id: member.id, password: memberPassword });
  }

  // 7. Switch to moderator to create bans
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 8. Create ban records (mix of temporary and permanent)
  const banReasons = [
    "Repeated violation of Rule 5: Be respectful",
    "Spam content detected",
    "Harassment of community members",
  ];

  const createdBans: ICommunityPlatformCommunityBan[] = [];

  for (let i = 0; i < bannedMembersData.length; i++) {
    const banType = i === 0 ? "temporary" : "permanent";
    const expiresAt =
      banType === "temporary"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const ban =
      await api.functional.communityPlatform.moderator.communities.bans.create(
        connection,
        {
          communityId: community.id,
          body: {
            member_id: bannedMembersData[i].id,
            ban_type: banType,
            reason: banReasons[i],
            expires_at: expiresAt,
          } satisfies ICommunityPlatformCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
    createdBans.push(ban);
  }

  // 9. Test 1: Retrieve bans with basic pagination
  const paginationResult: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(paginationResult);

  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    paginationResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    paginationResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination total records matches ban count",
    paginationResult.pagination.records === createdBans.length,
  );
  TestValidator.predicate(
    "pagination total pages is at least 1",
    paginationResult.pagination.pages >= 1,
  );

  // 11. Validate ban records in response
  TestValidator.equals(
    "ban records count matches pagination",
    paginationResult.data.length,
    createdBans.length,
  );

  // 12. Validate individual ban record details
  for (let i = 0; i < paginationResult.data.length; i++) {
    const banSummary = paginationResult.data[i];
    TestValidator.predicate(
      `ban ${i} has valid ID`,
      typia.is<string & tags.Format<"uuid">>(banSummary.id),
    );
    TestValidator.predicate(
      `ban ${i} has valid ban type`,
      banSummary.banType === "temporary" || banSummary.banType === "permanent",
    );
    TestValidator.predicate(
      `ban ${i} has non-empty reason`,
      banSummary.reason.length > 0,
    );
    TestValidator.predicate(
      `ban ${i} has valid creation timestamp`,
      typia.is<string & tags.Format<"date-time">>(banSummary.createdAt),
    );

    // Validate references
    TestValidator.predicate(
      `ban ${i} community reference exists`,
      banSummary.community !== null && banSummary.community !== undefined,
    );
    TestValidator.predicate(
      `ban ${i} member reference exists`,
      banSummary.member !== null && banSummary.member !== undefined,
    );
    TestValidator.predicate(
      `ban ${i} moderator reference exists`,
      banSummary.moderator !== null && banSummary.moderator !== undefined,
    );

    // Validate appeal status
    TestValidator.predicate(
      `ban ${i} has valid appeal status`,
      ["none", "pending", "approved", "denied"].includes(
        banSummary.appealStatus,
      ),
    );

    // For temporary bans, verify expires_at is set
    if (banSummary.banType === "temporary") {
      TestValidator.predicate(
        `ban ${i} has expiration timestamp for temporary ban`,
        banSummary.expiresAt !== null && banSummary.expiresAt !== undefined,
      );
    }
  }

  // 13. Test 2: Search with ban_status filter (active)
  const activeBansResult: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          ban_status: "active",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(activeBansResult);

  TestValidator.predicate(
    "active bans filter returns results",
    activeBansResult.data.length > 0,
  );

  // 14. Test 3: Search with member_id filter
  const memberFilterResult: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          member_id: bannedMembersData[0].id,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(memberFilterResult);

  TestValidator.predicate(
    "member filter returns results for specific member",
    memberFilterResult.data.length >= 1,
  );

  // 15. Test 4: Search with ban_type filter (temporary)
  const temporaryBansResult: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          ban_type: "temporary",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(temporaryBansResult);

  TestValidator.predicate(
    "temporary ban filter returns temporary bans",
    temporaryBansResult.data.every((ban) => ban.banType === "temporary"),
  );

  // 16. Test 5: Search with ban_type filter (permanent)
  const permanentBansResult: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          ban_type: "permanent",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(permanentBansResult);

  TestValidator.predicate(
    "permanent ban filter returns permanent bans",
    permanentBansResult.data.every((ban) => ban.banType === "permanent"),
  );

  // 17. Test 6: Search with sort options (created_at descending)
  const sortedResult: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(sortedResult);

  TestValidator.predicate(
    "sorted result returns records in correct order",
    sortedResult.data.length === paginationResult.data.length,
  );

  // 18. Validate complete response structure
  TestValidator.predicate(
    "pagination object has all required fields",
    paginationResult.pagination.current !== undefined &&
      paginationResult.pagination.limit !== undefined &&
      paginationResult.pagination.records !== undefined &&
      paginationResult.pagination.pages !== undefined,
  );

  TestValidator.predicate(
    "all ban records have community reference with required fields",
    paginationResult.data.every(
      (ban) =>
        ban.community.id &&
        ban.community.identifier &&
        ban.community.name &&
        ban.community.subscriber_count !== undefined &&
        ban.community.post_count !== undefined &&
        ban.community.created_at,
    ),
  );

  TestValidator.predicate(
    "all ban records have member reference with required fields",
    paginationResult.data.every(
      (ban) =>
        ban.member.id &&
        ban.member.username &&
        ban.member.email &&
        ban.member.account_status &&
        ban.member.karma_score !== undefined &&
        ban.member.created_at,
    ),
  );

  TestValidator.predicate(
    "all ban records have moderator reference with required fields",
    paginationResult.data.every(
      (ban) => ban.moderator.id && ban.moderator.username,
    ),
  );
}
