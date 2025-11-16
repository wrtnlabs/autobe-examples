import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_name_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test@Password123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Register and authenticate as an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@Password123";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create a category as administrator
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Test with valid name length (3-100 characters)
  const validCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(50),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(validCommunity);
  TestValidator.predicate(
    "valid community name should be between 3-100 characters",
    validCommunity.name.length >= 3 && validCommunity.name.length <= 100,
  );

  // Step 6: Test with name too short (less than 3 characters)
  await TestValidator.error(
    "community creation with name too short should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "ab",
            identifier: RandomGenerator.alphabets(8),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 7: Test with name too long (more than 100 characters)
  await TestValidator.error(
    "community creation with name too long should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.alphabets(101),
            identifier: RandomGenerator.alphabets(8),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 8: Test boundary case - exactly 3 characters
  const minBoundaryCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(3),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(minBoundaryCommunity);
  TestValidator.equals(
    "minimum boundary name has exactly 3 characters",
    minBoundaryCommunity.name.length,
    3,
  );

  // Step 9: Test boundary case - exactly 100 characters
  const maxBoundaryCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(100),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(maxBoundaryCommunity);
  TestValidator.equals(
    "maximum boundary name has exactly 100 characters",
    maxBoundaryCommunity.name.length,
    100,
  );
}
