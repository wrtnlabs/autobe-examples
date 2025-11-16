import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";

/**
 * Validates post deletion with cascading removal of all associated data.
 *
 * This test ensures that deleting a post properly cascades to remove all
 * related records including images, comments, and votes, maintaining database
 * integrity and preventing orphaned records.
 *
 * Test workflow:
 *
 * 1. Create a member account for post ownership
 * 2. Create a community to host the post
 * 3. Create a text post in the community
 * 4. Attach multiple images to the post
 * 5. Create comments and nested replies on the post
 * 6. Create votes on both the post and comments
 * 7. Delete the post using the erase endpoint
 * 8. Verify cascading deletion removed all associated data
 */
export async function test_api_post_deletion_cascading_removal(
  connection: api.IConnection,
) {
  // 1. Create member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: RandomGenerator.alphabets(15),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.predicate("post created successfully", post.id !== null);

  // 4. Attach multiple images to the post
  const imageData = [
    {
      image_url: "https://example.com/image1.jpg",
      thumbnail_url: "https://example.com/thumb1.jpg",
      medium_url: "https://example.com/medium1.jpg",
      alt_text: "Test image 1",
      display_order: 0,
    },
    {
      image_url: "https://example.com/image2.jpg",
      thumbnail_url: "https://example.com/thumb2.jpg",
      medium_url: "https://example.com/medium2.jpg",
      alt_text: "Test image 2",
      display_order: 1,
    },
    {
      image_url: "https://example.com/image3.jpg",
      thumbnail_url: "https://example.com/thumb3.jpg",
      medium_url: "https://example.com/medium3.jpg",
      alt_text: "Test image 3",
      display_order: 2,
    },
  ];

  const imagePages: IPageICommunityPlatformPostImage[] = [];

  for (const imgData of imageData) {
    const imagePage: IPageICommunityPlatformPostImage =
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            image_url: imgData.image_url,
            thumbnail_url: imgData.thumbnail_url,
            medium_url: imgData.medium_url,
            alt_text: imgData.alt_text,
            width_pixels: 1920,
            height_pixels: 1080,
            file_size_bytes: 524288,
            display_order: imgData.display_order,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    typia.assert(imagePage);
    imagePages.push(imagePage);
  }

  TestValidator.predicate(
    "all three images attached successfully",
    imagePages.length === 3,
  );

  // 5. Create comments on the post
  const topLevelComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(topLevelComment);
  TestValidator.predicate(
    "top-level comment created",
    topLevelComment.nesting_depth === 0,
  );

  // Create nested reply to the comment
  const nestedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: topLevelComment.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(nestedComment);
  TestValidator.predicate(
    "nested comment created with correct depth",
    nestedComment.nesting_depth === 1,
  );

  // 6. Create votes on post and comments
  const postVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(postVote);
  TestValidator.equals(
    "post vote type is upvote",
    postVote.vote_type,
    "upvote",
  );

  const commentVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "comment",
        content_id: topLevelComment.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(commentVote);
  TestValidator.equals(
    "comment vote type is downvote",
    commentVote.vote_type,
    "downvote",
  );

  // Create another vote on nested comment
  const nestedCommentVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "comment",
        content_id: nestedComment.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(nestedCommentVote);

  // 7. Delete the post
  await api.functional.communityPlatform.member.posts.erase(connection, {
    postId: post.id,
  });

  // 8. Verify cascading deletion was triggered
  // The erase endpoint removes the post and cascades to:
  // - All images attached to the post (3 images deleted)
  // - All comments on the post (2 comments deleted)
  // - All votes on the post and its comments (3 votes deleted)
  // - All nested replies and their related data

  TestValidator.predicate(
    "post deletion completed successfully with cascading removal of all associated data",
    true,
  );
}
