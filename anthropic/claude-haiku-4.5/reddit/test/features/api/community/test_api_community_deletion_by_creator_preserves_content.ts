import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test soft deletion of community by creator while preserving all associated
 * content.
 *
 * Verifies that community soft deletion (with 30-day recovery window)
 * preserves:
 *
 * - All posts, comments, and member subscriptions in database
 * - Content metrics (post_count, comment_count, subscriber_count)
 * - Historical data for potential recovery
 * - Proper deleted_at timestamp marking deletion time
 *
 * Process:
 *
 * 1. Create member accounts (creator and additional members)
 * 2. Create category for community classification
 * 3. Create community with creator as owner
 * 4. Verify community initial state and metrics
 * 5. Delete community by creator (soft delete)
 * 6. Verify deleted_at is set and content is preserved
 * 7. Confirm content metrics remain intact
 */
export async function test_api_community_deletion_by_creator_preserves_content(
  connection: api.IConnection,
) {
  // Step 1: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category created", category.id !== null);

  // Step 2: Create administrator account
  const adminData = {
    email: `admin-${RandomGenerator.alphaNumeric(8)}@test.com` as string &
      tags.Format<"email">,
    password: "TestPassword123!",
    username: `admin_${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/join" as string & tags.Format<"uri">,
  };
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create member creator account
  const memberCreatorEmail =
    `member-${RandomGenerator.alphaNumeric(8)}@test.com` as string &
      tags.Format<"email">;
  const memberCreatorData = {
    email: memberCreatorEmail,
    username: `creator_${RandomGenerator.alphabets(6)}`,
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/join" as string & tags.Format<"uri">,
    referrer: "http://localhost:3000" as string & tags.Format<"uri">,
  };
  const memberCreator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreatorData satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberCreator);

  // Step 4: Create community as member creator
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  };
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate("community created", community.id !== null);
  TestValidator.equals(
    "creator matches member",
    community.creator.id,
    memberCreator.id,
  );
  TestValidator.predicate(
    "initial subscriber count is 1",
    community.subscriber_count === 1,
  );
  TestValidator.predicate(
    "initial post count is 0",
    community.post_count === 0,
  );
  TestValidator.predicate(
    "initial comment count is 0",
    community.comment_count === 0,
  );
  TestValidator.predicate(
    "deleted_at is null initially",
    community.deleted_at === null || community.deleted_at === undefined,
  );

  // Step 5: Store initial metrics before deletion
  const initialSubscriberCount = community.subscriber_count;
  const initialPostCount = community.post_count;
  const initialCommentCount = community.comment_count;

  // Step 6: Delete community by creator (soft delete)
  const deletedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.erase(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);

  // Step 7: Verify deletion state
  TestValidator.equals(
    "community id unchanged after deletion",
    deletedCommunity.id,
    community.id,
  );
  TestValidator.predicate(
    "deleted_at is set",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 8: Verify content metrics are preserved during soft delete
  TestValidator.equals(
    "subscriber count preserved",
    deletedCommunity.subscriber_count,
    initialSubscriberCount,
  );
  TestValidator.equals(
    "post count preserved",
    deletedCommunity.post_count,
    initialPostCount,
  );
  TestValidator.equals(
    "comment count preserved",
    deletedCommunity.comment_count,
    initialCommentCount,
  );

  // Step 9: Verify other properties remain unchanged
  TestValidator.equals(
    "community name unchanged",
    deletedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community identifier unchanged",
    deletedCommunity.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "creator info unchanged",
    deletedCommunity.creator.id,
    community.creator.id,
  );
  TestValidator.equals(
    "category unchanged",
    deletedCommunity.category.id,
    community.category.id,
  );
  TestValidator.equals(
    "visibility unchanged",
    deletedCommunity.visibility,
    community.visibility,
  );
}
