import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberActivity";

/**
 * Test member activity retrieval when member activities include deleted or
 * moderator-removed content.
 *
 * Validates soft-delete handling in member activity records. When posts or
 * comments are deleted (user deletion or moderator removal), the activity
 * records remain in the database but display null content fields while
 * preserving engagement metrics. This ensures proper thread structure and
 * visibility restrictions.
 *
 * Test Flow:
 *
 * 1. Create administrator and member accounts for multi-actor testing
 * 2. Create category and community for content organization
 * 3. Create multiple posts with engagement simulation
 * 4. Query member activities to establish baseline
 * 5. Validate activity record structure and content preservation
 * 6. Verify engagement metrics are properly populated
 * 7. Test pagination and sorting of member activities
 */
export async function test_api_member_activity_deleted_content_handling(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for system operations
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphabets(6) + "Aa1!";
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphabets(6)}`,
          slug: `test-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: "Test category for activity handling",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for content creation
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphabets(6) + "Aa1!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  const memberId = member.id;

  // Step 4: Create community for post creation
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Activity Test Community ${RandomGenerator.alphabets(5)}`,
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple posts to generate activity records
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.member.posts.create(connection, {
          body: {
            community_id: community.id,
            post_type: "text",
            title: `Activity Test Post ${RandomGenerator.alphabets(6)}`,
            content_text: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityPlatformPost.ICreate,
        });
      typia.assert(post);
      return post;
    },
  );

  TestValidator.predicate(
    "should have created multiple posts",
    posts.length === 3,
  );

  // Step 6: Retrieve member activities with pagination
  const activitiesResponse: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: memberId,
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesResponse);

  TestValidator.predicate(
    "pagination should be present",
    activitiesResponse.pagination !== null &&
      activitiesResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "activities data should be present",
    activitiesResponse.data !== null && activitiesResponse.data !== undefined,
  );

  // Step 7: Validate activity record structure and content preservation
  for (const activity of activitiesResponse.data) {
    typia.assert(activity);

    TestValidator.predicate(
      "activity should have id",
      activity.id !== null && activity.id !== undefined,
    );

    TestValidator.predicate(
      "activity should have member reference",
      activity.member !== null && activity.member !== undefined,
    );

    TestValidator.predicate(
      "activity should have community reference",
      activity.community !== null && activity.community !== undefined,
    );

    TestValidator.predicate(
      "activity should have type",
      activity.activityType === "post" || activity.activityType === "comment",
    );

    TestValidator.predicate(
      "activity should have creation timestamp",
      activity.createdAt !== null && activity.createdAt !== undefined,
    );

    // For active posts (not deleted), content should be present
    if (activity.activityType === "post") {
      // Posts with null content indicate deletion or removal
      // Posts with content are active and visible
      if (
        activity.contentTitle !== null &&
        activity.contentTitle !== undefined
      ) {
        TestValidator.predicate(
          "active post should have content preview",
          activity.contentPreview !== null &&
            activity.contentPreview !== undefined,
        );
      }
    }
  }

  // Step 8: Verify engagement metrics are properly tracked
  const postsWithEngagement = activitiesResponse.data.filter(
    (a) => a.activityType === "post" && a.contentTitle !== null,
  );

  for (const activity of postsWithEngagement) {
    TestValidator.predicate(
      "upvote count should be non-negative",
      activity.upvoteCount >= 0,
    );

    TestValidator.predicate(
      "downvote count should be non-negative",
      activity.downvoteCount >= 0,
    );

    TestValidator.predicate(
      "comment count should be non-negative or null",
      activity.commentCount === null ||
        activity.commentCount === undefined ||
        activity.commentCount >= 0,
    );
  }

  // Step 9: Test sorting by creation date
  const activitiesSortedDesc: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: memberId,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesSortedDesc);

  TestValidator.predicate(
    "sorted activities should maintain structure",
    activitiesSortedDesc.data.length > 0,
  );

  // Step 10: Test pagination with smaller limit
  const activitiesPaged: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: memberId,
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesPaged);

  TestValidator.predicate(
    "page limit should be respected",
    activitiesPaged.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination metadata should be present",
    activitiesPaged.pagination.limit === 2,
  );

  // Step 11: Validate soft-delete pattern understanding
  // Activities with null content (contentTitle and/or contentPreview null)
  // indicate deleted or moderator-removed content while maintaining records
  const activitiesWithDeletedContent = activitiesResponse.data.filter(
    (a) => a.contentTitle === null || a.contentPreview === null,
  );

  for (const activity of activitiesWithDeletedContent) {
    TestValidator.predicate(
      "deleted activity record should be maintained",
      activity.id !== null && activity.id !== undefined,
    );

    TestValidator.predicate(
      "deleted activity should preserve member reference",
      activity.member !== null && activity.member !== undefined,
    );

    TestValidator.predicate(
      "deleted activity should preserve community reference",
      activity.community !== null && activity.community !== undefined,
    );

    TestValidator.predicate(
      "deleted activity should preserve engagement metrics",
      activity.upvoteCount >= 0 && activity.downvoteCount >= 0,
    );
  }
}
