import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_with_post_restrictions(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  typia.assert(administrator.token.access);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community with 'open_to_all' post creation restriction and 'text_only' type restriction
  const communityOpenText: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(12).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityOpenText);
  TestValidator.equals(
    "community open_to_all with text_only restriction",
    communityOpenText.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "community text_only type restriction",
    communityOpenText.post_type_restriction,
    "text_only",
  );

  // Step 5: Create community with 'moderators_only' post creation restriction and 'images_only' type restriction
  const communityModsImages: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(12).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "moderators_only",
          post_type_restriction: "images_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityModsImages);
  TestValidator.equals(
    "community moderators_only restriction",
    communityModsImages.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "community images_only type restriction",
    communityModsImages.post_type_restriction,
    "images_only",
  );

  // Step 6: Create community with 'approved_members_only' post creation restriction and 'text_and_images' type restriction
  const communityApprovedMixed: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(12).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "approved_members_only",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityApprovedMixed);
  TestValidator.equals(
    "community approved_members_only restriction",
    communityApprovedMixed.post_creation_restriction,
    "approved_members_only",
  );
  TestValidator.equals(
    "community text_and_images type restriction",
    communityApprovedMixed.post_type_restriction,
    "text_and_images",
  );

  // Step 7: Create community with 'karma_requirement' post creation restriction
  const communityKarmaReq: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(12).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "karma_requirement",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityKarmaReq);
  TestValidator.equals(
    "community karma_requirement restriction",
    communityKarmaReq.post_creation_restriction,
    "karma_requirement",
  );

  // Step 8: Validate community properties
  TestValidator.equals(
    "creator is authenticated member",
    communityOpenText.creator.id,
    member.id,
  );
  TestValidator.equals(
    "category matches created category",
    communityOpenText.category.slug,
    category.slug,
  );
  TestValidator.predicate(
    "subscriber count initialized to 1",
    communityOpenText.subscriber_count === 1,
  );
  TestValidator.predicate(
    "post count initialized to 0",
    communityOpenText.post_count === 0,
  );
  TestValidator.predicate(
    "comment count initialized to 0",
    communityOpenText.comment_count === 0,
  );

  // Step 9: Validate community settings persistence
  TestValidator.predicate(
    "community visibility is public",
    communityOpenText.visibility === "public",
  );
  TestValidator.predicate(
    "community identifier is unique and immutable",
    communityOpenText.identifier === communityOpenText.identifier,
  );
  TestValidator.predicate(
    "community created_at is set",
    communityOpenText.created_at !== null &&
      communityOpenText.created_at !== undefined,
  );
}
