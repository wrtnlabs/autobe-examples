import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_by_member_with_public_visibility(
  connection: api.IConnection,
) {
  // 1. Setup: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(8);
  const adminCreateBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10),
    username: adminUsername,
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    { body: adminCreateBody },
  );
  typia.assert(adminAuthorized);

  // 2. Create a category for community assignment
  const categoryName = RandomGenerator.paragraph({ sentences: 1 });
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const categoryCreateBody = {
    name: categoryName,
    slug: categorySlug,
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: undefined,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Setup: Create member account that will be the community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberCreateBody = {
    email: memberEmail,
    username: memberUsername,
    password: RandomGenerator.alphabets(10),
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(memberAuthorized);

  // 4. Create a public community
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communityIdentifier = RandomGenerator.alphabets(10).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });

  const communityCreateBody = {
    name: communityName,
    identifier: communityIdentifier,
    description: communityDescription,
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  // 5. Verify community response structure and values
  TestValidator.equals(
    "community name matches input",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community identifier matches input",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community description matches input",
    createdCommunity.description,
    communityDescription,
  );

  // 6. Verify visibility and permissions
  TestValidator.equals(
    "community visibility is public",
    createdCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "post creation restriction is open_to_all",
    createdCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction is all_types",
    createdCommunity.post_type_restriction,
    "all_types",
  );

  // 7. Verify initial metrics
  TestValidator.equals(
    "subscriber count initialized to 1 (creator)",
    createdCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "post count initialized to 0",
    createdCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "comment count initialized to 0",
    createdCommunity.comment_count,
    0,
  );

  // 8. Verify category reference
  TestValidator.equals(
    "category id matches",
    createdCommunity.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    createdCommunity.category.name,
    category.name,
  );
  TestValidator.equals(
    "category slug matches",
    createdCommunity.category.slug,
    category.slug,
  );

  // 9. Verify creator reference
  TestValidator.equals(
    "creator id matches member id",
    createdCommunity.creator.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "creator username matches member username",
    createdCommunity.creator.username,
    memberUsername,
  );
  TestValidator.equals(
    "creator email matches member email",
    createdCommunity.creator.email,
    memberEmail,
  );

  // 10. Verify timestamps are set
  TestValidator.predicate(
    "created_at timestamp is set",
    createdCommunity.created_at !== null &&
      createdCommunity.created_at !== undefined &&
      createdCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    createdCommunity.updated_at !== null &&
      createdCommunity.updated_at !== undefined &&
      createdCommunity.updated_at.length > 0,
  );

  // 11. Verify deleted_at is not set for active community
  TestValidator.predicate(
    "deleted_at is null for active community",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );

  // 12. Verify community ID is UUID format
  TestValidator.predicate(
    "community id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCommunity.id,
    ),
  );
}
