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

export async function test_api_member_activity_sorted_by_engagement(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminUser);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple posts with different engagement metrics
  const posts: ICommunityPlatformPost[] = [];

  // Post 1: 50 upvotes, 5 downvotes, 10 comments
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "High upvotes post",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);
  posts.push(post1);

  // Post 2: 30 upvotes, 15 downvotes, 5 comments
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Medium upvotes post",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);
  posts.push(post2);

  // Post 3: 10 upvotes, 20 downvotes, 15 comments
  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Low upvotes post",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);
  posts.push(post3);

  // Step 6: Test sorting by upvotes in descending order
  const activitiesSortedByUpvotes: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "upvotes",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesSortedByUpvotes);

  // Verify upvotes are in descending order
  if (activitiesSortedByUpvotes.data.length > 1) {
    for (let i = 0; i < activitiesSortedByUpvotes.data.length - 1; i++) {
      TestValidator.predicate(
        "upvotes should be in descending order",
        activitiesSortedByUpvotes.data[i].upvoteCount >=
          activitiesSortedByUpvotes.data[i + 1].upvoteCount,
      );
    }
  }

  // Step 7: Test sorting by downvotes in ascending order
  const activitiesSortedByDownvotes: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "downvotes",
        order: "asc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesSortedByDownvotes);

  // Verify downvotes are in ascending order
  if (activitiesSortedByDownvotes.data.length > 1) {
    for (let i = 0; i < activitiesSortedByDownvotes.data.length - 1; i++) {
      TestValidator.predicate(
        "downvotes should be in ascending order",
        activitiesSortedByDownvotes.data[i].downvoteCount <=
          activitiesSortedByDownvotes.data[i + 1].downvoteCount,
      );
    }
  }

  // Step 8: Test sorting by comments_count in descending order
  const activitiesSortedByComments: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "comments_count",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesSortedByComments);

  // Verify comments_count are in descending order (handling nullable values)
  if (activitiesSortedByComments.data.length > 1) {
    for (let i = 0; i < activitiesSortedByComments.data.length - 1; i++) {
      const current = activitiesSortedByComments.data[i].commentCount ?? 0;
      const next = activitiesSortedByComments.data[i + 1].commentCount ?? 0;
      TestValidator.predicate(
        "comments_count should be in descending order",
        current >= next,
      );
    }
  }

  // Step 9: Test sorting by created_at in descending order (most recent first)
  const activitiesSortedByDate: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesSortedByDate);

  // Verify created_at is in descending order (most recent first)
  if (activitiesSortedByDate.data.length > 1) {
    for (let i = 0; i < activitiesSortedByDate.data.length - 1; i++) {
      const currentDate = new Date(activitiesSortedByDate.data[i].createdAt);
      const nextDate = new Date(activitiesSortedByDate.data[i + 1].createdAt);
      TestValidator.predicate(
        "created_at should be in descending order (most recent first)",
        currentDate >= nextDate,
      );
    }
  }

  // Step 10: Verify pagination works correctly
  TestValidator.equals(
    "pagination current page should be 1",
    activitiesSortedByUpvotes.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be at least 3",
    activitiesSortedByUpvotes.pagination.records >= 3,
  );
}
