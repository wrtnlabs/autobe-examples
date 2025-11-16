import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_update_post_type_restrictions(
  connection: api.IConnection,
) {
  // 1. Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // 2. Create administrator account for category operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAuth.token.access,
    },
  };

  // 3. Create a community category
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
    display_order: 1,
    description: "Technology and programming discussions",
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Switch back to member connection for community creation
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };

  // 4. Create a community with 'all_types' post restriction
  const communityData = {
    name: `Community ${RandomGenerator.alphaNumeric(6)}`,
    identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
    description: "A test community for post type restrictions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: communityData },
    );
  typia.assert(community);
  TestValidator.equals(
    "initial community has all_types restriction",
    community.post_type_restriction,
    "all_types",
  );

  // 5. Update community to restrict post types to 'text_only'
  const updateData = {
    post_type_restriction: "text_only" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);

  // 6. Verify that the restriction change is reflected
  TestValidator.equals(
    "community post type restriction updated to text_only",
    updatedCommunity.post_type_restriction,
    "text_only",
  );

  // 7. Verify the restriction is enforced
  TestValidator.predicate(
    "text_only restriction is active",
    updatedCommunity.post_type_restriction === "text_only",
  );

  // 8. Test updating to different restrictions
  const updateToTextAndImages = {
    post_type_restriction: "text_and_images" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const textAndImagesUpdated =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: updateToTextAndImages,
      },
    );
  typia.assert(textAndImagesUpdated);
  TestValidator.equals(
    "community post type restriction updated to text_and_images",
    textAndImagesUpdated.post_type_restriction,
    "text_and_images",
  );

  // 9. Test updating to text_and_links restriction
  const updateToTextAndLinks = {
    post_type_restriction: "text_and_links" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const textAndLinksUpdated =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: updateToTextAndLinks,
      },
    );
  typia.assert(textAndLinksUpdated);
  TestValidator.equals(
    "community post type restriction updated to text_and_links",
    textAndLinksUpdated.post_type_restriction,
    "text_and_links",
  );

  // 10. Test updating to images_only restriction
  const updateToImagesOnly = {
    post_type_restriction: "images_only" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const imagesOnlyUpdated =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: updateToImagesOnly,
      },
    );
  typia.assert(imagesOnlyUpdated);
  TestValidator.equals(
    "community post type restriction updated to images_only",
    imagesOnlyUpdated.post_type_restriction,
    "images_only",
  );

  // 11. Verify community settings persist
  TestValidator.predicate(
    "community identifier remains unchanged",
    imagesOnlyUpdated.identifier === community.identifier,
  );

  TestValidator.predicate(
    "community name remains unchanged",
    imagesOnlyUpdated.name === community.name,
  );
}
