import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_retrieval_response_structure(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(2),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: "http://localhost:3000/icon.png",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(15),
      password: "SecurePass123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Retrieve the community by ID to test response structure
  const retrieved = await api.functional.communityPlatform.communities.at(
    connection,
    { communityId: community.id },
  );
  typia.assert(retrieved);

  // 6. Validate all response fields are correctly structured and typed
  // typia.assert() ensures complete type safety for all fields including:
  // - id and creator.id as UUID strings
  // - identifier, name, creator.username as strings with length constraints
  // - visibility, post_creation_restriction, post_type_restriction as valid enums
  // - subscriber_count, post_count, comment_count as non-negative integers
  // - created_at, updated_at, deleted_at as ISO 8601 datetimes
  // - category as nested object with id, name, slug, icon_url, display_order, is_active
  // - creator as nested object with id, username, email, email_verified, account_status, karma_score, created_at

  // 7. Validate business logic: retrieved data matches created data
  TestValidator.equals(
    "retrieved community id matches created community id",
    retrieved.id,
    community.id,
  );
  TestValidator.equals(
    "retrieved community identifier matches created identifier",
    retrieved.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "retrieved community name matches created name",
    retrieved.name,
    community.name,
  );
  TestValidator.equals(
    "retrieved category id matches created category id",
    retrieved.category.id,
    category.id,
  );
  TestValidator.equals(
    "retrieved category slug matches created slug",
    retrieved.category.slug,
    category.slug,
  );
  TestValidator.equals(
    "retrieved creator id matches member id",
    retrieved.creator.id,
    member.id,
  );

  // 8. Validate initial subscriber count includes creator
  TestValidator.predicate(
    "subscriber count is at least 1 (includes creator)",
    retrieved.subscriber_count >= 1,
  );

  // 9. Validate new community has no posts or comments
  TestValidator.equals("new community has zero posts", retrieved.post_count, 0);
  TestValidator.equals(
    "new community has zero comments",
    retrieved.comment_count,
    0,
  );

  // 10. Validate community is not deleted
  TestValidator.equals("community is not deleted", retrieved.deleted_at, null);

  // 11. Validate community configuration matches creation request
  TestValidator.equals(
    "visibility matches created visibility",
    retrieved.visibility,
    "public",
  );
  TestValidator.equals(
    "post_creation_restriction matches",
    retrieved.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post_type_restriction matches",
    retrieved.post_type_restriction,
    "all_types",
  );
}
