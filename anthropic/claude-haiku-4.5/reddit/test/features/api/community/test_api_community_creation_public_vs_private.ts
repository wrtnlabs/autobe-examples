import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_public_vs_private(
  connection: api.IConnection,
) {
  // Step 1: Set up test infrastructure
  // Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create technology category
  const category: ICommunityPlatformCategory =
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
  TestValidator.equals(
    "category created successfully",
    category.slug,
    "technology",
  );

  // Create first member for public community
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphabets(12);
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphaNumeric(8),
        password: member1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Create second member for private community
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphabets(12);
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphaNumeric(8),
        password: member2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 2: Create public community
  // Switch to member1 context
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Public Tech Community",
          identifier: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: "A public community for technology discussions",
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
  TestValidator.equals(
    "public community name matches",
    publicCommunity.name,
    "Public Tech Community",
  );

  // Step 3: Create private community
  // Switch to member2 context
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const privateCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Private Tech Community",
          identifier: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: "A private community for restricted discussions",
          visibility: "private",
          post_creation_restriction: "approved_members_only",
          post_type_restriction: "text_only",
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
  TestValidator.equals(
    "private community name matches",
    privateCommunity.name,
    "Private Tech Community",
  );

  // Step 4: Validate visibility settings are persisted
  TestValidator.equals(
    "public community visibility persisted",
    publicCommunity.visibility,
    "public",
  );
  TestValidator.notEquals(
    "public and private communities have different visibility",
    publicCommunity.visibility,
    privateCommunity.visibility,
  );

  // Step 5: Validate visibility affects community properties
  TestValidator.equals(
    "public community allows open post creation",
    publicCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "private community restricts post creation",
    privateCommunity.post_creation_restriction,
    "approved_members_only",
  );

  // Step 6: Verify visibility categories
  TestValidator.equals(
    "both communities assigned to same category",
    publicCommunity.category.slug,
    privateCommunity.category.slug,
  );

  // Step 7: Validate community creators
  TestValidator.equals(
    "public community creator is member1",
    publicCommunity.creator.email,
    member1Email,
  );
  TestValidator.equals(
    "private community creator is member2",
    privateCommunity.creator.email,
    member2Email,
  );

  // Step 8: Verify initial subscriber count (creator is auto-subscribed)
  TestValidator.predicate(
    "public community has at least 1 subscriber (creator)",
    publicCommunity.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "private community has at least 1 subscriber (creator)",
    privateCommunity.subscriber_count >= 1,
  );

  // Step 9: Verify community identifiers are unique
  TestValidator.notEquals(
    "public and private community identifiers are different",
    publicCommunity.identifier,
    privateCommunity.identifier,
  );
}
