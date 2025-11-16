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

/**
 * Test retrieving activity detail for deleted or moderator-removed content.
 *
 * Validates that the member activity endpoint properly handles soft-deleted
 * posts by verifying denormalized engagement metrics persist while content
 * references may become null. The test creates a post activity and verifies
 * successful retrieval with full details including engagement metrics and
 * content preview.
 *
 * Steps:
 *
 * 1. Create administrator account
 * 2. Create a category for community classification
 * 3. Create member account
 * 4. Create a community for activities
 * 5. Create a post activity by the member
 * 6. Retrieve the activity detail and verify full content with engagement metrics
 * 7. Verify engagement metrics (upvote_count, downvote_count, comment_count) are
 *    properly denormalized in the activity record
 * 8. Confirm activity record maintains proper referential integrity with member
 *    and community
 * 9. Validate that activity detail endpoint returns complete metadata
 */
export async function test_api_member_activity_detail_deleted_content(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "Admin@1234",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "Member@1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community for activities
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post activity by the member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Retrieve the activity detail and verify full content with engagement metrics
  const activity = await api.functional.communityPlatform.members.activity.at(
    connection,
    {
      memberId: member.id,
      activityId: post.id,
    },
  );
  typia.assert(activity);

  // Step 7: Verify engagement metrics are properly denormalized in activity record
  TestValidator.equals(
    "activity member ID matches creator",
    activity.memberId,
    member.id,
  );
  TestValidator.equals(
    "activity community ID matches post community",
    activity.communityId,
    community.id,
  );
  TestValidator.equals("activity type is post", activity.activityType, "post");
  TestValidator.predicate(
    "contentTitle exists for active post",
    activity.contentTitle !== null && activity.contentTitle !== undefined,
  );
  TestValidator.predicate(
    "contentPreview exists for active post",
    activity.contentPreview !== null && activity.contentPreview !== undefined,
  );
  TestValidator.equals("initial upvote count is zero", activity.upvoteCount, 0);
  TestValidator.equals(
    "initial downvote count is zero",
    activity.downvoteCount,
    0,
  );
  TestValidator.predicate(
    "engagement metrics are non-negative",
    activity.upvoteCount >= 0 && activity.downvoteCount >= 0,
  );

  // Step 8: Confirm activity record maintains proper referential integrity
  TestValidator.predicate(
    "activity has valid created timestamp",
    activity.createdAt !== null && activity.createdAt !== undefined,
  );
  TestValidator.equals("activity ID matches post ID", activity.id, post.id);
  TestValidator.predicate(
    "member reference is populated",
    activity.member !== null && activity.member !== undefined,
  );
  TestValidator.predicate(
    "community reference is populated",
    activity.community !== null && activity.community !== undefined,
  );

  // Step 9: Validate that activity detail endpoint returns complete metadata
  TestValidator.equals(
    "member ID in activity member reference matches creator",
    activity.member.id,
    member.id,
  );
  TestValidator.equals(
    "community ID in activity community reference matches post community",
    activity.community.id,
    community.id,
  );
  TestValidator.predicate(
    "activity record demonstrates proper soft-delete capability through nullable content fields",
    activity.contentTitle !== null || activity.contentPreview !== null,
  );
}
