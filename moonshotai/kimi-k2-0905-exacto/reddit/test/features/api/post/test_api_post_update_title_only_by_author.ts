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
 * Test updating only the title property of an existing post while keeping all
 * other content unchanged. Validates that partial updates work correctly
 * through the IRedditCommunityPost.IUpdate schema where all fields are
 * optional. The test ensures post titles can be modified independently without
 * affecting existing content, URL references, or community associations.
 *
 * Business Context:
 *
 * - Author creates initial post with specific content
 * - Author wants to update only the title without changing content
 * - System should preserve all original content
 * - Other properties remain unchanged
 */
export async function test_api_post_update_title_only_by_author(
  connection: api.IConnection,
) {
  // 1. Register as a member to establish authentication context
  const memberCredentials = {
    nickname: RandomGenerator.name(1),
    email: `test.${RandomGenerator.name(1)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // 2. Get available post types and communities for creating the base post
  const postType = typia.random<IRedditCommunityPostType.ISummary>();
  const community = typia.random<IRedditCommunityCommunity.ISummary>();

  // Skip creation if required data isn't available
  if (!postType.id || !community.id) {
    return;
  }

  // 3. Create base post with specific content including title
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalContent = RandomGenerator.content({ paragraphs: 3 });
  const originalLinkUrl = RandomGenerator.pick([
    null,
    "https://example.com/article",
  ]);

  const basePost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: originalTitle,
        content: originalContent,
        link_url: originalLinkUrl,
        reddit_community_id: community.id,
        reddit_post_type_id: postType.id,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(basePost);

  // Verify initial state
  TestValidator.equals(
    "initial post title matches",
    basePost.title,
    originalTitle,
  );
  TestValidator.equals(
    "initial post content matches",
    basePost.content,
    originalContent,
  );
  TestValidator.equals(
    "initial post author matches creator",
    basePost.author.id,
    member.id,
  );

  // 4. Update only the title property
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });

  // Ensure we actually changed the title
  TestValidator.notEquals(
    "new title is different from original",
    updatedTitle,
    originalTitle,
  );

  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: basePost.id,
      body: {
        title: updatedTitle,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // 5. Validate the partial update results
  // Title should have been updated
  TestValidator.equals(
    "post title updated correctly",
    updatedPost.title,
    updatedTitle,
  );

  // Other properties should remain unchanged
  TestValidator.equals(
    "post content preserved",
    updatedPost.content,
    originalContent,
  );
  TestValidator.equals(
    "post link_url preserved",
    updatedPost.link_url,
    originalLinkUrl,
  );
  TestValidator.equals("post id preserved", updatedPost.id, basePost.id);
  TestValidator.equals(
    "post author preserved",
    updatedPost.author.id,
    member.id,
  );
  TestValidator.equals(
    "post community preserved",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "post type preserved",
    updatedPost.post_type.id,
    postType.id,
  );

  // Metadata properties - these might change on updates
  // But core properties like id, content, link_url, community, author etc. should be verified
  TestValidator.predicate(
    "updated timestamp is different",
    updatedPost.updated_at !== basePost.updated_at,
  );

  // Vote counts should remain unchanged on title updates
  TestValidator.equals(
    "upvote count preserved",
    updatedPost.upvote_count,
    basePost.upvote_count,
  );
  TestValidator.equals(
    "downvote count preserved",
    updatedPost.downvote_count,
    basePost.downvote_count,
  );

  // Content-related counts should remain unchanged when only title is updated
  TestValidator.equals(
    "comment count preserved",
    updatedPost.comment_count,
    basePost.comment_count,
  );
}
