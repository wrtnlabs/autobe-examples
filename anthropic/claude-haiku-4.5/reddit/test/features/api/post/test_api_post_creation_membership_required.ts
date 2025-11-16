import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_creation_membership_required(
  connection: api.IConnection,
) {
  // 1. Create an administrator account to set up category
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Create a category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 3. Create a member account (authenticated user who will create posts)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: memberPassword,
    ip: "192.168.1.1",
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 4. Create a community where the member can post
  const communityData = {
    name: "Tech Discussions",
    identifier: "tech_discussions",
    description: "A community for tech discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created successfully",
    community.identifier,
    "tech_discussions",
  );

  // 5. Create a post with authenticated member - should succeed
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: "My First Post",
    content_text: RandomGenerator.content({ paragraphs: 2 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // 6. Verify that the creator of the post matches the authenticated member
  TestValidator.equals(
    "post creator ID matches authenticated member",
    post.creator.id,
    member.id,
  );
  TestValidator.equals(
    "post creator email matches member email",
    post.creator.email,
    memberEmail,
  );
  TestValidator.equals(
    "post belongs to correct community",
    post.community.id,
    community.id,
  );

  // 7. Verify that the post title was set correctly
  TestValidator.equals(
    "post title matches request",
    post.title,
    "My First Post",
  );

  // 8. Verify post engagement metrics are initialized correctly
  TestValidator.equals("post vote score initialized to 0", post.vote_score, 0);
  TestValidator.equals(
    "post upvote count initialized to 0",
    post.upvote_count,
    0,
  );
  TestValidator.equals(
    "post downvote count initialized to 0",
    post.downvote_count,
    0,
  );
  TestValidator.equals(
    "post comment count initialized to 0",
    post.comment_count,
    0,
  );

  // 9. Verify post visibility is public by default
  TestValidator.equals(
    "post visibility is public by default",
    post.visibility_status,
    "public",
  );

  // 10. Verify post has correct NSFW and spoiler flags
  TestValidator.predicate("post NSFW flag is false", post.is_nsfw === false);
  TestValidator.predicate(
    "post spoiler flag is false",
    post.has_spoiler === false,
  );

  // 11. Test creating a post without authenticated member context (unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "creating post without authentication should fail",
    async () => {
      await api.functional.communityPlatform.member.posts.create(
        unauthConnection,
        {
          body: postData,
        },
      );
    },
  );
}
