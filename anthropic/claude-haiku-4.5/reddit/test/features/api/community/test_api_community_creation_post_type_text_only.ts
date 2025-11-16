import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_post_type_text_only(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!@";
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for the community (as admin)
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology_" + RandomGenerator.alphaNumeric(4),
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password456!@";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community with post_type_restriction='text_only'
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Discussion Forum",
          identifier: "forum_" + RandomGenerator.alphaNumeric(6),
          description: "A text-only discussion forum",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Validate that the community has the correct post_type_restriction
  TestValidator.equals(
    "community post_type_restriction should be text_only",
    community.post_type_restriction,
    "text_only",
  );

  // Step 6: Validate community basic properties
  TestValidator.equals(
    "community visibility should be public",
    community.visibility,
    "public",
  );

  TestValidator.equals(
    "community post_creation_restriction should be open_to_all",
    community.post_creation_restriction,
    "open_to_all",
  );

  // Step 7: Validate community creator matches the authenticated member
  TestValidator.equals(
    "community creator id should match authenticated member",
    community.creator.id,
    member.id,
  );

  // Step 8: Validate category assignment
  TestValidator.equals(
    "community category slug should match",
    community.category.slug,
    category.slug,
  );

  // Step 9: Validate initial subscriber count (creator is auto-subscribed)
  TestValidator.predicate(
    "community subscriber_count should be at least 1",
    community.subscriber_count >= 1,
  );

  // Step 10: Validate community timestamps are properly set
  TestValidator.predicate(
    "community created_at should be set",
    community.created_at !== null && community.created_at !== undefined,
  );

  TestValidator.predicate(
    "community updated_at should be set",
    community.updated_at !== null && community.updated_at !== undefined,
  );

  // Step 11: Validate post counts are initialized to 0
  TestValidator.equals(
    "community initial post_count should be 0",
    community.post_count,
    0,
  );

  TestValidator.equals(
    "community initial comment_count should be 0",
    community.comment_count,
    0,
  );
}
