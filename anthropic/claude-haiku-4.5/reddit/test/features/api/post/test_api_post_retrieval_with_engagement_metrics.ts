import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_retrieval_with_engagement_metrics(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create a content category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost:3000/join",
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
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public" as const,
          post_creation_restriction: "open_to_all" as const,
          post_type_restriction: "all_types" as const,
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a text post
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const postContent = RandomGenerator.content({ paragraphs: 2 });

  const createdPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text" as const,
        title: postTitle,
        content_text: postContent,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(createdPost);

  // Validate newly created post has zero engagement metrics
  TestValidator.equals(
    "new post vote_score should be 0",
    createdPost.vote_score,
    0,
  );
  TestValidator.equals(
    "new post upvote_count should be 0",
    createdPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "new post downvote_count should be 0",
    createdPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "new post comment_count should be 0",
    createdPost.comment_count,
    0,
  );

  // 6. Retrieve the post by ID
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);

  // Validate retrieved post has correct engagement metrics initialized to zero
  TestValidator.equals(
    "retrieved post vote_score should be 0",
    retrievedPost.vote_score,
    0,
  );
  TestValidator.equals(
    "retrieved post upvote_count should be 0",
    retrievedPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "retrieved post downvote_count should be 0",
    retrievedPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "retrieved post comment_count should be 0",
    retrievedPost.comment_count,
    0,
  );

  // Validate engagement metric properties are integers
  TestValidator.predicate(
    "vote_score is non-negative integer",
    retrievedPost.vote_score >= 0 && Number.isInteger(retrievedPost.vote_score),
  );
  TestValidator.predicate(
    "upvote_count is non-negative integer",
    retrievedPost.upvote_count >= 0 &&
      Number.isInteger(retrievedPost.upvote_count),
  );
  TestValidator.predicate(
    "downvote_count is non-negative integer",
    retrievedPost.downvote_count >= 0 &&
      Number.isInteger(retrievedPost.downvote_count),
  );
  TestValidator.predicate(
    "comment_count is non-negative integer",
    retrievedPost.comment_count >= 0 &&
      Number.isInteger(retrievedPost.comment_count),
  );

  // Validate post content matches
  TestValidator.equals(
    "retrieved post title matches created post",
    retrievedPost.title,
    createdPost.title,
  );
  TestValidator.equals(
    "retrieved post type matches created post",
    retrievedPost.post_type,
    "text",
  );
  TestValidator.equals(
    "retrieved post community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "retrieved post creator ID matches",
    retrievedPost.creator.id,
    member.id,
  );
  TestValidator.equals(
    "retrieved post visibility status is public",
    retrievedPost.visibility_status,
    "public",
  );
}
