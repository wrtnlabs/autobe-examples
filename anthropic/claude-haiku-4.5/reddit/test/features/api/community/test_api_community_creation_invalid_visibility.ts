import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_invalid_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and set up category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: `Admin ${RandomGenerator.name()}`,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a category for communities
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: `test-cat-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: memberPassword,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 4: Test valid public visibility community creation
  const publicCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Public Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `public-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);
  TestValidator.equals(
    "public community should have correct visibility",
    publicCommunity.visibility,
    "public",
  );

  // Step 5: Test valid private visibility community creation
  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Private Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `private-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "private",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community should have correct visibility",
    privateCommunity.visibility,
    "private",
  );
}
