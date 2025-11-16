import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_update_moderator_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create category for community
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: categorySlug,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Login as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community with initial configuration
  const communityIdentifier = RandomGenerator.alphabets(10).toLowerCase();
  const initialName = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 4 });

  const initialCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: initialName,
          identifier: communityIdentifier,
          description: initialDescription,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(initialCommunity);

  // Step 5: Perform partial update as moderator (creator has moderator permissions)
  const partialUpdateBody = {
    post_creation_restriction: "moderators_only",
    post_type_restriction: "text_and_images",
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.moderator.communities.update(
      connection,
      {
        communityId: initialCommunity.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedCommunity);

  // Step 6: Validate that modified fields are updated correctly
  TestValidator.equals(
    "post_creation_restriction should be updated to moderators_only",
    updatedCommunity.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "post_type_restriction should be updated to text_and_images",
    updatedCommunity.post_type_restriction,
    "text_and_images",
  );

  // Step 7: Validate that unmodified fields are preserved from original creation
  TestValidator.equals(
    "name should remain unchanged after partial update",
    updatedCommunity.name,
    initialName,
  );
  TestValidator.equals(
    "description should remain unchanged after partial update",
    updatedCommunity.description,
    initialDescription,
  );
  TestValidator.equals(
    "visibility should remain unchanged after partial update",
    updatedCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "identifier should remain unchanged after partial update",
    updatedCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "category id should remain unchanged after partial update",
    updatedCommunity.category.id,
    initialCommunity.category.id,
  );

  // Step 8: Validate creator relationship is preserved
  TestValidator.equals(
    "creator id should remain unchanged after partial update",
    updatedCommunity.creator.id,
    initialCommunity.creator.id,
  );
}
