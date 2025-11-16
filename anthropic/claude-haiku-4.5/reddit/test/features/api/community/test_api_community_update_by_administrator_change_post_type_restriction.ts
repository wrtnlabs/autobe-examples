import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_update_by_administrator_change_post_type_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10),
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    href: "https://example.com/admin",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberData = {
    email: memberEmail,
    password: RandomGenerator.alphabets(10),
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    ip: "127.0.0.1",
    href: "https://example.com",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 3: Create a category
  const categoryData = {
    name: `Category_${RandomGenerator.alphaNumeric(8)}`,
    slug: `category_${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Create a community with 'all_types' restriction
  const communityData = {
    name: `Community_${RandomGenerator.alphaNumeric(8)}`,
    identifier: `community_${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
    description: RandomGenerator.paragraph(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "initial post_type_restriction is all_types",
    community.post_type_restriction,
    "all_types",
  );

  // Step 5: Update community to 'text_only' restriction
  const updateToTextOnlyData = {
    post_type_restriction: "text_only" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity1 =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateToTextOnlyData,
      },
    );
  typia.assert(updatedCommunity1);
  TestValidator.equals(
    "post_type_restriction updated to text_only",
    updatedCommunity1.post_type_restriction,
    "text_only",
  );

  // Step 6: Update community to 'text_and_images' restriction
  const updateToTextAndImagesData = {
    post_type_restriction: "text_and_images" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity2 =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateToTextAndImagesData,
      },
    );
  typia.assert(updatedCommunity2);
  TestValidator.equals(
    "post_type_restriction updated to text_and_images",
    updatedCommunity2.post_type_restriction,
    "text_and_images",
  );

  // Step 7: Update community to 'images_only' restriction
  const updateToImagesOnlyData = {
    post_type_restriction: "images_only" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity3 =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateToImagesOnlyData,
      },
    );
  typia.assert(updatedCommunity3);
  TestValidator.equals(
    "post_type_restriction updated to images_only",
    updatedCommunity3.post_type_restriction,
    "images_only",
  );

  // Step 8: Verify multiple sequential restriction changes persist
  TestValidator.equals(
    "final post_type_restriction is images_only",
    updatedCommunity3.post_type_restriction,
    "images_only",
  );
  TestValidator.predicate(
    "community metadata preserved after restrictions",
    updatedCommunity3.id === community.id,
  );
  TestValidator.predicate(
    "community identifier unchanged",
    updatedCommunity3.identifier === community.identifier,
  );
}
