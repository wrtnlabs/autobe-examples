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

export async function test_api_community_ban_search_unauthorized_non_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a category for the test community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Register a member who will create the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member-${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community as the member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Register a different non-moderator member
  const nonModeratorEmail = typia.random<string & tags.Format<"email">>();
  const nonModerator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: nonModeratorEmail,
        username: `non-mod-${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(nonModerator);

  // Step 5: Authenticate as the non-moderator member
  await api.functional.auth.member.login(connection, {
    body: {
      email: nonModeratorEmail,
      password: "TestPassword123!",
      href: "https://test.example.com/login",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Attempt to search bans as non-moderator (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "non-moderator cannot search community bans",
    403,
    async () => {
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
    },
  );
}
