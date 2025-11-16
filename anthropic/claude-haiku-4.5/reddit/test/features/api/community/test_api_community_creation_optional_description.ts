import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_optional_description(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
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

  // 2. Create category for community assignment
  const categoryName = RandomGenerator.name(2);
  const categorySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community WITH description
  const communityWithDescIdentifier =
    RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityWithDescName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const communityWithDesc: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityWithDescName,
          identifier: communityWithDescIdentifier,
          description: communityDescription,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityWithDesc);
  TestValidator.equals(
    "community with description should have matching description",
    communityWithDesc.description,
    communityDescription,
  );

  // 5. Create community WITHOUT description (null)
  const communityNoDescIdentifier =
    RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityNoDescName = RandomGenerator.name(2);
  const communityNoDesc: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityNoDescName,
          identifier: communityNoDescIdentifier,
          description: null,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityNoDesc);
  TestValidator.predicate(
    "community without description should have null description",
    communityNoDesc.description === null,
  );

  // 6. Create community with empty string description
  const communityEmptyDescIdentifier =
    RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityEmptyDescName = RandomGenerator.name(2);
  const communityEmptyDesc: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityEmptyDescName,
          identifier: communityEmptyDescIdentifier,
          description: "",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityEmptyDesc);
  TestValidator.predicate(
    "community with empty description should be accepted",
    communityEmptyDesc.description === "" ||
      communityEmptyDesc.description === null,
  );
}
