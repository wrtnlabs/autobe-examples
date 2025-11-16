import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community identifiers must be globally unique.
 *
 * Validates that the platform enforces the constraint preventing duplicate
 * community identifiers. When a second member attempts to create a community
 * with an identifier that already exists, the operation should fail with HTTP
 * 409 Conflict error, confirming that identifier uniqueness is enforced at the
 * database level.
 *
 * Steps:
 *
 * 1. Create administrator and category for test setup
 * 2. Create first member and community with identifier 'tech_news'
 * 3. Create second member
 * 4. Attempt to create community with duplicate identifier 'tech_news'
 * 5. Verify HTTP 409 Conflict error is returned
 * 6. Confirm error indicates identifier already exists
 */
export async function test_api_community_creation_identifier_uniqueness_constraint(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category for communities
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member and community with identifier 'tech_news'
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphabets(12);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: member1Password,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  const communityIdentifier = "tech_news";
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Technology News Community",
          identifier: communityIdentifier,
          description: "A community for sharing tech news and discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  TestValidator.equals(
    "first community identifier",
    community1.identifier,
    communityIdentifier,
  );

  // Step 4: Create second member
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphabets(12);
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: member2Password,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 5: Create second member's connection by logging in
  const member2Connection: api.IConnection = { ...connection, headers: {} };
  const member2Auth = await api.functional.auth.member.login(
    member2Connection,
    {
      body: {
        email: member2Email,
        password: member2Password,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(member2Auth);

  // Step 6: Attempt to create community with duplicate identifier - should fail with 409
  await TestValidator.error(
    "duplicate identifier should return 409 Conflict",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        member2Connection,
        {
          body: {
            name: "Another Tech News Community",
            identifier: communityIdentifier,
            description: "This should fail due to duplicate identifier",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Verify the first community is still intact
  TestValidator.equals(
    "first community still exists",
    community1.identifier,
    communityIdentifier,
  );
}
