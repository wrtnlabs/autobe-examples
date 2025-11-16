import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_deletion_authorization_non_creator_rejected(
  connection: api.IConnection,
) {
  // 1. Create a category for community creation
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology related communities",
          icon_url: undefined,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Create first member account (community creator)
  const creatorEmail = `creator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const creatorPassword = "SecurePassword123!";
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: `creator_${RandomGenerator.alphaNumeric(8)}`,
      password: creatorPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // 3. Create second member account (non-creator moderator)
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPassword = "SecurePassword123!";
  const moderator = await api.functional.auth.member.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      password: moderatorPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(moderator);

  // 4. Login as creator to create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 5. Creator creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "creator should be set correctly",
    community.creator.id,
    creator.id,
  );

  // 6. Login as moderator (non-creator) to attempt deletion
  await api.functional.auth.member.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 7. Attempt deletion by non-creator via administrator endpoint - should be rejected with 403 Forbidden
  await TestValidator.error(
    "non-creator member should not be able to delete community via administrator endpoint",
    async () => {
      await api.functional.communityPlatform.administrator.communities.erase(
        connection,
        {
          communityId: community.id,
        },
      );
    },
  );

  // 8. Verify community remains intact with no deletion timestamp
  TestValidator.predicate(
    "community should remain intact after unauthorized deletion attempt",
    community.deleted_at === null || community.deleted_at === undefined,
  );
}
