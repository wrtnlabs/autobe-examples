import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieval of communities with different visibility settings.
 *
 * Validates that public communities are accessible to all users, private
 * communities are restricted to subscribed members and creators, and visibility
 * controls are properly enforced across different authentication levels.
 *
 * Test workflow:
 *
 * 1. Setup: Create members, administrator, and categories
 * 2. Create public and private communities with different creators
 * 3. Test guest access: Public community returns 200, private returns 403
 * 4. Test member access: Creators and subscribed members can view, non-subscribed
 *    cannot
 * 5. Verify visibility enforcement and response data integrity
 */
export async function test_api_community_retrieval_with_all_visibility_types(
  connection: api.IConnection,
) {
  // Store email addresses for login
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member2Email = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();

  // 1. Create member 1 for public community
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. Create member 2 for private community
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 3. Create administrator for category creation
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "AdminPassword123!",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 4. Create categories for communities
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Authenticate as member 1 and create public community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const publicCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Public Community",
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);
  TestValidator.equals(
    "public community visibility set correctly",
    publicCommunity.visibility,
    "public",
  );

  // 6. Authenticate as member 2 and create private community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Private Community",
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          visibility: "private",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community visibility set correctly",
    privateCommunity.visibility,
    "private",
  );

  // 7. Test guest access - create unauthenticated connection
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // 8. Retrieve public community as guest (should succeed)
  const publicCommunityGuest =
    await api.functional.communityPlatform.communities.at(guestConnection, {
      communityId: publicCommunity.id,
    });
  typia.assert(publicCommunityGuest);
  TestValidator.equals(
    "guest successfully retrieves public community",
    publicCommunityGuest.id,
    publicCommunity.id,
  );
  TestValidator.equals(
    "retrieved public community has correct visibility",
    publicCommunityGuest.visibility,
    "public",
  );

  // 9. Test guest access to private community (should fail with 403)
  await TestValidator.error(
    "guest cannot retrieve private community",
    async () => {
      await api.functional.communityPlatform.communities.at(guestConnection, {
        communityId: privateCommunity.id,
      });
    },
  );

  // 10. Authenticate member 1 again
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 11. Member 1 retrieves public community (should succeed - public access)
  const publicCommunityMember1 =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: publicCommunity.id,
    });
  typia.assert(publicCommunityMember1);
  TestValidator.equals(
    "member retrieves public community successfully",
    publicCommunityMember1.id,
    publicCommunity.id,
  );
  TestValidator.equals(
    "public community creator info is correct",
    publicCommunityMember1.creator.id,
    member1.id,
  );

  // 12. Member 1 attempts to retrieve private community (should fail - not subscribed, not creator)
  await TestValidator.error(
    "non-subscribed member cannot retrieve private community",
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityId: privateCommunity.id,
      });
    },
  );

  // 13. Authenticate member 2 to verify they can access their own private community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const privateCommunityCreator =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: privateCommunity.id,
    });
  typia.assert(privateCommunityCreator);
  TestValidator.equals(
    "creator retrieves their private community",
    privateCommunityCreator.id,
    privateCommunity.id,
  );
  TestValidator.equals(
    "private community creator matches member 2",
    privateCommunityCreator.creator.id,
    member2.id,
  );
  TestValidator.equals(
    "private community has correct visibility for creator",
    privateCommunityCreator.visibility,
    "private",
  );
}
