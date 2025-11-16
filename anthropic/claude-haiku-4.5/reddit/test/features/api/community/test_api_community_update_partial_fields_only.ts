import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test partial update functionality where only the description field is
 * modified.
 *
 * This test validates that sparse updates work correctly - only the description
 * is changed while other community properties remain intact. Verifies that the
 * API doesn't accidentally reset non-provided fields to default values.
 *
 * Steps:
 *
 * 1. Create member account (community creator)
 * 2. Create category for community classification
 * 3. Create community with full configuration
 * 4. Retrieve and store initial community state
 * 5. Send partial update with only description field
 * 6. Verify description was updated
 * 7. Confirm all other fields remained unchanged
 */
export async function test_api_community_update_partial_fields_only(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "ValidPassword123!",
        href: "http://localhost/register",
        referrer: "http://localhost/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member created successfully",
    member.id !== undefined,
  );

  // Step 2: Create category
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and programming discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create community with initial configuration
  const initialDescription =
    "Initial community description about technology topics";
  const communityData = {
    name: "Tech Discussions",
    identifier: "tech_discussions",
    description: initialDescription,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);
  TestValidator.equals(
    "community created with initial description",
    createdCommunity.description,
    initialDescription,
  );
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
    "post type restriction is text_and_images",
    createdCommunity.post_type_restriction,
    "text_and_images",
  );

  // Store initial state
  const initialCommunity = createdCommunity;

  // Step 4: Perform partial update - only change description
  const updatedDescription =
    "Updated community description with new focus areas";
  const updatePayload = {
    description: updatedDescription,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: createdCommunity.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedCommunity);

  // Step 5: Validate description was updated
  TestValidator.equals(
    "description was updated",
    updatedCommunity.description,
    updatedDescription,
  );

  // Step 6: Verify other fields remained unchanged
  TestValidator.equals(
    "name remained unchanged",
    updatedCommunity.name,
    initialCommunity.name,
  );
  TestValidator.equals(
    "identifier remained unchanged",
    updatedCommunity.identifier,
    initialCommunity.identifier,
  );
  TestValidator.equals(
    "visibility remained unchanged",
    updatedCommunity.visibility,
    initialCommunity.visibility,
  );
  TestValidator.equals(
    "post_creation_restriction remained unchanged",
    updatedCommunity.post_creation_restriction,
    initialCommunity.post_creation_restriction,
  );
  TestValidator.equals(
    "post_type_restriction remained unchanged",
    updatedCommunity.post_type_restriction,
    initialCommunity.post_type_restriction,
  );
  TestValidator.equals(
    "subscriber_count remained unchanged",
    updatedCommunity.subscriber_count,
    initialCommunity.subscriber_count,
  );
  TestValidator.equals(
    "post_count remained unchanged",
    updatedCommunity.post_count,
    initialCommunity.post_count,
  );
  TestValidator.equals(
    "comment_count remained unchanged",
    updatedCommunity.comment_count,
    initialCommunity.comment_count,
  );

  // Step 7: Verify category and creator information remained intact
  TestValidator.equals(
    "category id remained unchanged",
    updatedCommunity.category.id,
    initialCommunity.category.id,
  );
  TestValidator.equals(
    "creator id remained unchanged",
    updatedCommunity.creator.id,
    initialCommunity.creator.id,
  );
}
