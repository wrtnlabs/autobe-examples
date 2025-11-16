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

export async function test_api_member_activity_detail_embedded_context(
  connection: api.IConnection,
) {
  // 1. Create administrator account for platform setup
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member account for activity creation
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPass123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a community in the category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: "A test community for activity validation",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post (activity) in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Test Post ${RandomGenerator.alphaNumeric(6)}`,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Retrieve the activity detail by member ID and activity ID
  const activity: ICommunityPlatformMemberActivity =
    await api.functional.communityPlatform.members.activity.at(connection, {
      memberId: member.id,
      activityId: post.id,
    });
  typia.assert(activity);

  // 7. Validate embedded member context
  TestValidator.equals(
    "activity member ID matches creator ID",
    activity.memberId,
    member.id,
  );
  TestValidator.equals(
    "embedded member summary has correct ID",
    activity.member.id,
    member.id,
  );
  TestValidator.predicate(
    "embedded member has username",
    activity.member.username.length > 0,
  );
  TestValidator.predicate(
    "embedded member has email",
    activity.member.email.length > 0,
  );
  TestValidator.predicate(
    "embedded member has email_verified flag",
    typeof activity.member.email_verified === "boolean",
  );
  TestValidator.predicate(
    "embedded member has account_status",
    activity.member.account_status !== undefined,
  );
  TestValidator.predicate(
    "embedded member has karma_score",
    typeof activity.member.karma_score === "number",
  );
  TestValidator.predicate(
    "embedded member has created_at timestamp",
    activity.member.created_at.length > 0,
  );

  // 8. Validate embedded community context
  TestValidator.equals(
    "activity community ID matches post community",
    activity.communityId,
    community.id,
  );
  TestValidator.equals(
    "embedded community summary has correct ID",
    activity.community.id,
    community.id,
  );
  TestValidator.equals(
    "embedded community identifier matches",
    activity.community.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "embedded community name matches",
    activity.community.name,
    community.name,
  );
  TestValidator.predicate(
    "embedded community has subscriber_count",
    typeof activity.community.subscriber_count === "number",
  );
  TestValidator.predicate(
    "embedded community has post_count",
    typeof activity.community.post_count === "number",
  );
  TestValidator.predicate(
    "embedded community has created_at timestamp",
    activity.community.created_at.length > 0,
  );

  // 9. Validate activity type and denormalized data
  TestValidator.equals("activity type is post", activity.activityType, "post");
  TestValidator.predicate(
    "activity has content title for post",
    activity.contentTitle !== undefined,
  );
  TestValidator.predicate(
    "activity has vote counts",
    typeof activity.upvoteCount === "number" &&
      typeof activity.downvoteCount === "number",
  );
  TestValidator.predicate(
    "activity has creation timestamp",
    activity.createdAt.length > 0,
  );
}
