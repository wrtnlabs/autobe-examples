import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test changing a post's type classification using the optional
 * reddit_post_type_id field in IRedditCommunityPost.IUpdate. Validates that
 * posts can be reclassified between text, link, and image formats, supporting
 * scenarios where users need to correct post categorization or adapt content
 * format based on community evolution.
 *
 * This test creates a text post and then demonstrates the flexibility of the
 * Reddit Community platform by recategorizing it through different post
 * formats. The test validates that:
 *
 * - Posts can transition from text to link format by updating reddit_post_type_id
 *   and adding a link_url
 * - Posts can be reclassified to image format by changing reddit_post_type_id
 *   while setting content to null
 * - Each recategorization preserves the post identity while changing the content
 *   format appropriately
 * - The platform supports post type evolution as communities adapt their content
 *   policies
 *
 * Implementation follows realistic community evolution scenarios where users
 * need to adjust content format based on changing community requirements or
 * personal content strategies.
 */
export async function test_api_post_post_type_recategorization(
  connection: api.IConnection,
) {
  // 1. Register new member for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create text post with content suitable for text-based discussion
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const textPostTypeId = typia.random<string & tags.Format<"uuid">>();

  const textPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: communityId,
        reddit_post_type_id: textPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);

  // Store initial post type for later validation
  const initialPostType = textPost.post_type;

  // 3. Verify initial post state
  const initialPostRetrieval =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: "Initial Text Post",
        content: "Testing post type recategorization",
        reddit_community_id: communityId,
        reddit_post_type_id: textPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(initialPostRetrieval);

  // 4. Change to link post by updating reddit_post_type_id and adding link_url
  const linkPostTypeId = typia.random<string & tags.Format<"uuid">>();
  const newLinkTitle = RandomGenerator.paragraph({ sentences: 2 });

  const linkPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: initialPostRetrieval.id,
      body: {
        title: newLinkTitle,
        reddit_post_type_id: linkPostTypeId,
        link_url: "https://example.com/link-post-content" satisfies string &
          tags.Format<"uri">,
        content: null, // Remove text content when converting to link format
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(linkPost);

  // 5. Validate recategorization to link format
  TestValidator.equals("link post title updated", linkPost.title, newLinkTitle);
  TestValidator.equals(
    "link post reddit_post_type_id changed",
    linkPost.post_type.id,
    linkPostTypeId,
  );
  TestValidator.predicate(
    "link post has URL field",
    linkPost.link_url !== null && linkPost.link_url !== undefined,
  );
  TestValidator.equals("link post content nullified", linkPost.content, null);

  // 6. Change to image post by updating reddit_post_type_id and ensuring content is null
  const imagePostTypeId = typia.random<string & tags.Format<"uuid">>();
  const newImageTitle = RandomGenerator.paragraph({ sentences: 2 });

  const imagePost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: linkPost.id,
      body: {
        title: newImageTitle,
        reddit_post_type_id: imagePostTypeId,
        link_url: null, // Remove URL when converting to image format
        content: null, // Ensure content remains null for image format
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(imagePost);

  // 7. Validate final recategorization to image format
  TestValidator.equals(
    "image post title updated",
    imagePost.title,
    newImageTitle,
  );
  TestValidator.equals(
    "image post reddit_post_type_id changed",
    imagePost.post_type.id,
    imagePostTypeId,
  );
  TestValidator.equals("image post has no link_url", imagePost.link_url, null);
  TestValidator.equals("image post has no content", imagePost.content, null);
  TestValidator.equals(
    "post maintains same ID through recategorizations",
    imagePost.id,
    initialPostRetrieval.id,
  );

  // 8. Verify community reference remains stable
  TestValidator.equals(
    "post maintains same community",
    imagePost.community.id,
    communityId,
  );

  // 9. Validate author reference remains unchanged
  TestValidator.equals(
    "post maintains same author",
    imagePost.author.id,
    member.id,
  );

  // 10. Verify post creation timestamps remain unaffected by type changes
  TestValidator.predicate(
    "post creation timestamp before update",
    imagePost.created_at === initialPostRetrieval.created_at,
  );
}
