import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that unauthenticated requests to create communities are rejected.
 *
 * This test validates that the community creation endpoint requires proper
 * member authentication and prevents anonymous users from creating
 * communities.
 *
 * Process:
 *
 * 1. Create an administrator and category for test setup
 * 2. Create an unauthenticated connection (empty headers)
 * 3. Attempt to create a community without authentication
 * 4. Verify that the API returns 401 Unauthorized error
 * 5. Confirm that authentication is required for community creation
 */
export async function test_api_community_creation_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for test setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Verify that unauthenticated requests are rejected with 401
  await TestValidator.httpError(
    "unauthenticated community creation should be rejected with 401",
    401,
    async () => {
      return await api.functional.communityPlatform.member.communities.create(
        unauthenticatedConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            identifier: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 5: Verify that authenticated requests succeed
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { ...connection };
  const member = await api.functional.auth.member.join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create community with authenticated connection
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "authenticated member created the community",
    community.creator.id,
    member.id,
  );
}
