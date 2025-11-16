import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_visibility_options(
  connection: api.IConnection,
) {
  // 1. Create administrator and category for community creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create a category for communities
  const categoryData = {
    name: "Technology",
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: "Discussion about technology topics",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create a member for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8).toLowerCase(),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Test public community creation
  const publicCommunityData = {
    name: "Public Tech Discussion",
    identifier: `public_${RandomGenerator.alphabets(6).toLowerCase()}`,
    description: "A public community for technology discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: publicCommunityData },
    );
  typia.assert(publicCommunity);
  TestValidator.equals(
    "public community visibility is set correctly",
    publicCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "public community identifier matches",
    publicCommunity.identifier,
    publicCommunityData.identifier,
  );
  TestValidator.equals(
    "public community creator is the member",
    publicCommunity.creator.id,
    member.id,
  );

  // 5. Test private community creation
  const privateCommunityData = {
    name: "Private Discussion Group",
    identifier: `private_${RandomGenerator.alphabets(6).toLowerCase()}`,
    description: "A private community for restricted discussions",
    visibility: "private" as const,
    post_creation_restriction: "approved_members_only" as const,
    post_type_restriction: "text_only" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const privateCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: privateCommunityData },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community visibility is set correctly",
    privateCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "private community identifier matches",
    privateCommunity.identifier,
    privateCommunityData.identifier,
  );
  TestValidator.equals(
    "private community requires approved members",
    privateCommunity.post_creation_restriction,
    "approved_members_only",
  );

  // 6. Verify different post type restrictions with visibility options
  const mixedCommunityData = {
    name: "Mixed Settings Community",
    identifier: `mixed_${RandomGenerator.alphabets(6).toLowerCase()}`,
    description: "Community with mixed configuration",
    visibility: "public" as const,
    post_creation_restriction: "moderators_only" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const mixedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: mixedCommunityData },
    );
  typia.assert(mixedCommunity);
  TestValidator.equals(
    "mixed community is public",
    mixedCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "mixed community restricts posts to moderators",
    mixedCommunity.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "mixed community allows text and images",
    mixedCommunity.post_type_restriction,
    "text_and_images",
  );

  // 7. Verify community properties are initialized correctly
  TestValidator.predicate(
    "public community has initial subscriber count of 1",
    publicCommunity.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "public community has zero initial posts",
    publicCommunity.post_count === 0,
  );
  TestValidator.predicate(
    "public community has zero initial comments",
    publicCommunity.comment_count === 0,
  );
  TestValidator.predicate(
    "public community has created_at timestamp",
    publicCommunity.created_at !== null,
  );
  TestValidator.predicate(
    "public community has updated_at timestamp",
    publicCommunity.updated_at !== null,
  );

  // 8. Verify visibility affects community properties
  TestValidator.notEquals(
    "public and private communities have different visibility settings",
    publicCommunity.visibility,
    privateCommunity.visibility,
  );
  TestValidator.equals(
    "public community can have open post creation",
    publicCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "private community has restricted post creation",
    privateCommunity.post_creation_restriction,
    "approved_members_only",
  );
}
