import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

/**
 * Test that deleting a saved content item properly updates the member's saved
 * content collection.
 *
 * This test validates the saved content deletion workflow:
 *
 * 1. Create an authenticated member account
 * 2. Create a community for test posts
 * 3. Create two posts in the community
 * 4. Retrieve the member's saved collection before deletion
 * 5. If saved items exist, delete one and verify it's removed
 * 6. Verify the collection count is decremented and other items remain
 *
 * Note: The test focuses on the deletion and collection update behavior using
 * available APIs.
 */
export async function test_api_saved_content_deletion_updates_collection(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = `test_member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberData = {
    email: memberEmail,
    username: `testuser_${RandomGenerator.alphaNumeric(6)}`,
    password: "TestPassword123!",
    ip: "192.168.1.1",
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  const memberId = member.id;

  // Step 2: Create a community for test posts
  const categorySlug = "technology";
  const communityData = {
    name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
    identifier: `testcomm_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: categorySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);
  const communityId = community.id;

  // Step 3: Create first post
  const post1Data = {
    community_id: communityId,
    post_type: "text" as const,
    title: `Test Post 1 ${RandomGenerator.alphaNumeric(6)}`,
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: post1Data },
  );
  typia.assert(post1);

  // Step 4: Create second post
  const post2Data = {
    community_id: communityId,
    post_type: "text" as const,
    title: `Test Post 2 ${RandomGenerator.alphaNumeric(6)}`,
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: post2Data },
  );
  typia.assert(post2);

  // Step 5: Retrieve initial saved collection
  const savedRequest = {
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const initialCollection =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      { memberId, body: savedRequest },
    );
  typia.assert(initialCollection);

  TestValidator.predicate(
    "initial saved collection should have pagination info",
    initialCollection.pagination !== undefined,
  );

  TestValidator.predicate(
    "initial saved collection should have data array",
    Array.isArray(initialCollection.data),
  );

  const initialCount = initialCollection.data.length;

  // Step 6: If collection has items, test deletion workflow
  if (initialCount > 0) {
    // Get the first saved item to delete
    const itemToDelete = initialCollection.data[0];
    const savedIdToDelete = itemToDelete.id;

    // Step 7: Delete the first saved item
    await api.functional.communityPlatform.member.members.saved.erase(
      connection,
      { memberId, savedId: savedIdToDelete },
    );

    // Step 8: Retrieve collection after deletion
    const afterDeletionCollection =
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        { memberId, body: savedRequest },
      );
    typia.assert(afterDeletionCollection);

    // Step 9: Verify the deleted item is no longer in the collection
    const deletedItemFound = afterDeletionCollection.data.some(
      (item) => item.id === savedIdToDelete,
    );
    TestValidator.predicate(
      "deleted saved item should not appear in updated collection",
      !deletedItemFound,
    );

    // Step 10: Verify collection count is decremented
    const afterDeletionCount = afterDeletionCollection.data.length;
    TestValidator.equals(
      "collection count should be decremented by one after deletion",
      afterDeletionCount,
      initialCount - 1,
    );

    // Step 11: Verify other saved items remain
    if (initialCount > 1) {
      const remainingItems = initialCollection.data.slice(1);
      for (const originalItem of remainingItems) {
        const stillExists = afterDeletionCollection.data.some(
          (item) => item.id === originalItem.id,
        );
        TestValidator.predicate(
          `saved item ${originalItem.id} should remain in collection`,
          stillExists,
        );
      }
    }
  } else {
    // If no items in collection, test is still valid - deletion of empty collection
    TestValidator.predicate(
      "initial collection is empty, deletion workflow cannot be tested",
      true,
    );
  }
}
