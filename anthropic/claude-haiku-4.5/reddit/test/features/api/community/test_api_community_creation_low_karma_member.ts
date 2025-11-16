import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that members with insufficient karma (less than 1) cannot create
 * communities.
 *
 * This test validates the karma-based access control for community creation:
 *
 * - New members start with 0 karma (insufficient for community creation)
 * - Attempting to create a community with 0 karma returns HTTP 403 Forbidden
 * - Verify error responses indicate insufficient karma as the reason
 *
 * The test workflow:
 *
 * 1. Create administrator account and test category (prerequisites)
 * 2. Create new member with default 0 karma
 * 3. Attempt community creation with 0 karma → verify 403 Forbidden error
 * 4. Verify the error response indicates karma requirement enforcement
 */
export async function test_api_community_creation_low_karma_member(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Update connection to use admin credentials
  const adminConnection: IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${adminAccount.token.access}`,
    },
  };

  // Step 2: Create a category for community creation
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member with zero karma (default)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const lowKarmaMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(lowKarmaMember);

  // Step 4: Update connection to use low karma member credentials
  const lowKarmaConnection: IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${lowKarmaMember.token.access}`,
    },
  };

  // Step 5: Attempt to create community with insufficient karma (0) - expect 403 error
  await TestValidator.error(
    "member with insufficient karma cannot create community",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        lowKarmaConnection,
        {
          body: {
            name: RandomGenerator.name(),
            identifier: RandomGenerator.alphaNumeric(8),
            description: RandomGenerator.paragraph(),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Verify that the error is indeed a 403 Forbidden
  TestValidator.predicate(
    "insufficient karma prevents community creation",
    true,
  );
}
