import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test community category reclassification workflow by a moderator.
 *
 * This comprehensive test validates the complete moderator workflow for
 * updating community category assignments to reflect evolving content focus.
 * The test follows a realistic business scenario involving multiple
 * authentication actors and demonstrates proper authorization boundaries.
 */
export async function test_api_community_moderator_update_category_reclassification(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community as the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(2),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Switch to moderator authentication context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Update community category as moderator
  const updatedCommunity =
    await api.functional.communityPlatform.moderator.communities.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          description: RandomGenerator.content({ paragraphs: 1 }),
          category: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: RandomGenerator.alphaNumeric(10),
            display_name: RandomGenerator.name(2),
            slug: RandomGenerator.alphaNumeric(8),
            description: RandomGenerator.content({ paragraphs: 1 }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
            is_active: true,
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies ICommunityPlatformCommunityCategory.ISummary,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 6: Validate the category update was successful
  TestValidator.equals(
    "community slug remains unchanged after category reclassification",
    updatedCommunity.slug,
    community.slug,
  );

  TestValidator.equals(
    "community name remains unchanged after category reclassification",
    updatedCommunity.name,
    community.name,
  );

  TestValidator.notEquals(
    "community description should be updated during category reclassification",
    updatedCommunity.description,
    community.description,
  );

  TestValidator.predicate(
    "community should have a category assigned after moderator update",
    updatedCommunity.category !== undefined,
  );

  TestValidator.predicate(
    "assigned category should have valid ID",
    updatedCommunity.category?.id !== undefined &&
      updatedCommunity.category.id.length > 0,
  );

  TestValidator.predicate(
    "assigned category should have active status",
    updatedCommunity.category?.status === "active",
  );

  TestValidator.predicate(
    "assigned category should be marked as active",
    updatedCommunity.category?.is_active === true,
  );
}
