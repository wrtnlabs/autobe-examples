import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_retrieval_with_nsfw_and_spoiler_flags(
  connection: api.IConnection,
) {
  // 1. Setup: Create administrator account to provision the category system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });

  // 2. Create category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create member account for posting content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const memberUsername = RandomGenerator.alphabets(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create community for posting
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // 5. Create post with NSFW and spoiler flags
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: "Movie Discussion with Spoilers",
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
    is_nsfw: true,
    has_spoiler: true,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // 6. Verify NSFW flag is set on created post
  TestValidator.predicate(
    "created post should be marked as NSFW",
    createdPost.is_nsfw === true,
  );

  // 7. Verify spoiler flag is set on created post
  TestValidator.predicate(
    "created post should be marked with spoiler warning",
    createdPost.has_spoiler === true,
  );

  // 8. Retrieve the post by ID to verify flags persist in retrieval
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);

  // 9. Validate retrieved post NSFW flag matches created post
  TestValidator.equals(
    "retrieved post NSFW flag should be true",
    retrievedPost.is_nsfw,
    true,
  );

  // 10. Validate retrieved post spoiler flag matches created post
  TestValidator.equals(
    "retrieved post spoiler flag should be true",
    retrievedPost.has_spoiler,
    true,
  );

  // 11. Validate other content flags are defaults
  TestValidator.equals(
    "retrieved post should not be locked by default",
    retrievedPost.is_locked,
    false,
  );

  TestValidator.equals(
    "retrieved post should not be pinned by default",
    retrievedPost.is_pinned,
    false,
  );

  // 12. Validate visibility status is public
  TestValidator.equals(
    "retrieved post visibility should be public",
    retrievedPost.visibility_status,
    "public",
  );

  // 13. Validate community reference is correct
  TestValidator.equals(
    "retrieved post community ID should match created community",
    retrievedPost.community.id,
    community.id,
  );

  // 14. Validate creator reference is correct
  TestValidator.equals(
    "retrieved post creator ID should match member",
    retrievedPost.creator.id,
    member.id,
  );

  // 15. Validate engagement metrics are initialized
  TestValidator.equals(
    "new post should have zero vote score",
    retrievedPost.vote_score,
    0,
  );

  TestValidator.equals(
    "new post should have zero upvotes",
    retrievedPost.upvote_count,
    0,
  );

  TestValidator.equals(
    "new post should have zero downvotes",
    retrievedPost.downvote_count,
    0,
  );

  TestValidator.equals(
    "new post should have zero comments",
    retrievedPost.comment_count,
    0,
  );

  // 16. Validate post title matches input
  TestValidator.equals(
    "retrieved post title should match created post",
    retrievedPost.title,
    postData.title,
  );

  // 17. Validate post type is text
  TestValidator.equals(
    "retrieved post type should be text",
    retrievedPost.post_type,
    "text",
  );
}
