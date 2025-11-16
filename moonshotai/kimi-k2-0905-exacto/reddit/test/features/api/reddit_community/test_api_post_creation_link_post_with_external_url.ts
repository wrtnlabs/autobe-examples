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
 * Test creating a link post with external URL validation.
 *
 * This test validates the creation of link posts containing external URLs,
 * ensuring proper URL format validation, post type classification, and
 * community association within the Reddit Community platform's content
 * moderation framework.
 *
 * 1. Create authenticated member account for posting
 * 2. Get community information to verify link posting permissions
 * 3. Create post type reference for link posts
 * 4. Test valid external URL link post creation
 * 5. Verify post properties and associations
 * 6. Test that link URL is properly stored and formatted
 * 7. Validate post type classification as link post
 * 8. Verify community association and metadata
 */
export async function test_api_post_creation_link_post_with_external_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Since we need community and post type references, we'll use random UUIDs
  // for demonstration as the API provides summary types for these references
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create valid external URL for link post
  const externalUrl = "https://github.com/samchon/nestia";
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });

  // 4. Create link post with external URL
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: null, // Link posts typically don't have content body
        link_url: externalUrl,
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);

  // 5. Validate post creation and properties
  TestValidator.predicate("link post has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(linkPost.id),
  );
  TestValidator.equals("link post title matches", linkPost.title, postTitle);
  TestValidator.equals("link post content is null", linkPost.content, null);
  TestValidator.equals("link post URL matches", linkPost.link_url, externalUrl);

  // 6. Verify community association
  TestValidator.predicate("link post has community association", () =>
    typia.is<IRedditCommunityCommunity.ISummary>(linkPost.community),
  );
  TestValidator.equals(
    "link post community ID matches",
    linkPost.community.id,
    communityId,
  );

  // 7. Verify post type classification
  TestValidator.predicate("link post has post type association", () =>
    typia.is<IRedditCommunityPostType.ISummary>(linkPost.post_type),
  );
  TestValidator.equals(
    "link post type ID matches",
    linkPost.post_type.id,
    postTypeId,
  );

  // 8. Verify author association
  TestValidator.predicate("link post has author association", () =>
    typia.is<IRedditCommunityMember.ISummary>(linkPost.author),
  );
  TestValidator.equals(
    "link post author ID matches",
    linkPost.author.id,
    member.id,
  );

  // 9. Verify initial counts are zero
  TestValidator.equals(
    "link post upvote count starts at zero",
    linkPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "link post downvote count starts at zero",
    linkPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "link post view count starts at zero",
    linkPost.view_count,
    0,
  );
  TestValidator.equals(
    "link post comment count starts at zero",
    linkPost.comment_count,
    0,
  );

  // 10. Verify post flags and timestamps
  TestValidator.equals(
    "link post is not locked initially",
    linkPost.is_locked,
    false,
  );
  TestValidator.equals(
    "link post is not pinned initially",
    linkPost.is_pinned,
    false,
  );
  TestValidator.predicate("link post has valid creation timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(linkPost.created_at),
  );
  TestValidator.predicate("link post has valid update timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(linkPost.updated_at),
  );
}
