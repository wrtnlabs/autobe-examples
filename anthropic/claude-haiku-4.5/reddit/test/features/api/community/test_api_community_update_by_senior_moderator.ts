import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_update_by_senior_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create category for community classification
  const categoryCreator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(categoryCreator);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const memberCreator = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberCreator);

  // Step 3: Create community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Original Community Name",
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: "Original description",
          visibility: "public" as const,
          post_creation_restriction: "open_to_all" as const,
          post_type_restriction: "all_types" as const,
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create moderator account (senior moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(10);
  const moderatorJoined = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: moderatorPassword,
      href: "https://example.com/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorJoined);

  // Step 5: Switch context to moderator for update operation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Senior moderator updates community settings
  const updateData = {
    name: "Updated Community Name",
    description: "Updated description with new content",
    visibility: "private" as const,
    post_creation_restriction: "moderators_only" as const,
    post_type_restriction: "text_only" as const,
    category_id: category.id,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity =
    await api.functional.communityPlatform.moderator.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);

  // Step 7: Validate the updates were applied correctly
  TestValidator.equals(
    "community name updated",
    updatedCommunity.name,
    "Updated Community Name",
  );
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description,
    "Updated description with new content",
  );
  TestValidator.equals(
    "community visibility changed to private",
    updatedCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "post creation restriction changed to moderators only",
    updatedCommunity.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "post type restriction changed to text only",
    updatedCommunity.post_type_restriction,
    "text_only",
  );
  TestValidator.equals(
    "community category updated",
    updatedCommunity.category.id,
    category.id,
  );
}
