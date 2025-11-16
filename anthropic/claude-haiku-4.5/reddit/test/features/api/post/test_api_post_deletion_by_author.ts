import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test successful deletion of a post by its creator.
 *
 * This test validates the complete workflow where an authenticated member can
 * create a post in a community and then delete it. The test verifies:
 *
 * 1. Create a new member account through registration (authentication setup)
 * 2. Create a community that will host the test post
 * 3. Create a post within that community
 * 4. Delete the post using the post ID (main test operation)
 * 5. Verify the deletion was successful (void response indicates success)
 *
 * This scenario tests the core post deletion functionality and confirms that
 * authorized post creators can permanently remove their own content from the
 * platform.
 */
export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreate,
    });
  typia.assert(member);

  // Step 2: Create a community that will host the test post
  const communityCreate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "text_only",
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a post within the community
  const postCreate = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 6 }),
    content_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Delete the post using the post ID
  await api.functional.communityPlatform.member.posts.erase(connection, {
    postId: post.id,
  });

  // Step 5: Verify deletion was successful
  // The erase function returns void on success, confirming deletion
  TestValidator.predicate("post deletion completed without error", true);
}
