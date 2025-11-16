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

export async function test_api_community_ban_search_filter_by_ban_type(
  connection: api.IConnection,
) {
  // Step 1: Register administrator for category creation
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category for the test community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register a member to create community
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphabets(10),
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community
  const community =
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

  // Step 5: Register a moderator for the community
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphabets(10),
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Register a member to be banned
  const bannedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphabets(10),
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(bannedMember);

  // Step 7: Create a temporary ban for the member
  const temporaryBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "temporary",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(temporaryBan);

  // Step 8: Create a permanent ban for the member
  const permanentBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "permanent",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Step 9: Filter bans by temporary type and validate only temporary bans are returned
  const temporaryBansResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          ban_type: "temporary",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(temporaryBansResult);
  TestValidator.predicate(
    "should return only temporary bans when filtered by temporary type",
    () => temporaryBansResult.data.every((ban) => ban.banType === "temporary"),
  );
  TestValidator.predicate(
    "temporary bans result should include the created temporary ban",
    () => temporaryBansResult.data.some((ban) => ban.id === temporaryBan.id),
  );

  // Step 10: Filter bans by permanent type and validate only permanent bans are returned
  const permanentBansResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          ban_type: "permanent",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(permanentBansResult);
  TestValidator.predicate(
    "should return only permanent bans when filtered by permanent type",
    () => permanentBansResult.data.every((ban) => ban.banType === "permanent"),
  );
  TestValidator.predicate(
    "permanent bans result should include the created permanent ban",
    () => permanentBansResult.data.some((ban) => ban.id === permanentBan.id),
  );

  // Step 11: Filter bans without ban_type specified and validate both types are included
  const allBansResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(allBansResult);
  TestValidator.predicate(
    "should return both temporary and permanent bans when ban_type is not specified",
    () => {
      const hasTemporary = allBansResult.data.some(
        (ban) => ban.banType === "temporary",
      );
      const hasPermanent = allBansResult.data.some(
        (ban) => ban.banType === "permanent",
      );
      return hasTemporary && hasPermanent;
    },
  );
  TestValidator.predicate(
    "all bans result should include both created bans",
    () => {
      const hasTemporaryBan = allBansResult.data.some(
        (ban) => ban.id === temporaryBan.id,
      );
      const hasPermanentBan = allBansResult.data.some(
        (ban) => ban.id === permanentBan.id,
      );
      return hasTemporaryBan && hasPermanentBan;
    },
  );

  // Step 12: Validate pagination information is present and correct
  TestValidator.predicate(
    "pagination should include current page number",
    () => allBansResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should include limit value",
    () => allBansResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should include total records count",
    () => allBansResult.pagination.records >= 2,
  );
}
