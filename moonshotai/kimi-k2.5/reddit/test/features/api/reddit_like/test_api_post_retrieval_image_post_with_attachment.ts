import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test retrieving an image post with complete attachment metadata.
 *
 * This test validates:
 * 1. Member authentication
 * 2. Image attachment upload
 * 3. Community creation
 * 4. Community subscription
 * 5. Image post creation with attachment reference
 * 6. Post retrieval with full attachment metadata
 * 7. Content type polymorphism works correctly for image posts
 */
export async function test_api_post_retrieval_image_post_with_attachment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Upload image attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: "https://example.com/test-image.jpg",
          originalFilename: "test-image.jpg",
        } satisfies IRedditLikeAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Step 3: Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 4: Subscribe to community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 5: Create image post referencing the uploaded attachment
  const createdPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Image Post",
        community_id: community.id,
        post_type: "image",
        attachment_id: attachment.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(createdPost);
  // Step 6: Retrieve the post
  const retrievedPost = await api.functional.redditLike.posts.at(
    memberConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);
  // Step 7: Validate response structure
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals(
    "post title matches",
    retrievedPost.title,
    createdPost.title,
  );
  TestValidator.equals("postType is image", retrievedPost.postType, "image");
  TestValidator.equals("author ID matches", retrievedPost.author.id, member.id);
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  // Validate image content structure
  const imageContent = retrievedPost.content as IRedditLikePostImageContent;
  typia.assertGuard(imageContent);
  TestValidator.equals(
    "attachment ID matches",
    imageContent.attachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment originalFilename matches",
    imageContent.attachment.originalFilename,
    attachment.originalFilename,
  );
  TestValidator.equals(
    "attachment mimeType matches",
    imageContent.attachment.mimeType,
    attachment.mimeType,
  );
  TestValidator.equals(
    "attachment fileSizeBytes matches",
    imageContent.attachment.fileSizeBytes,
    attachment.fileSizeBytes,
  );
  TestValidator.equals(
    "uploader ID matches",
    imageContent.attachment.uploadedByMember.id,
    member.id,
  );
  // Validate thumbnail data (nullable)
  if (imageContent.thumbnail !== null) {
    TestValidator.predicate(
      "thumbnail has valid ID",
      imageContent.thumbnail.id.length > 0,
    );
  }
  // Validate timestamps exist
  TestValidator.predicate(
    "createdAt is valid timestamp",
    imageContent.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid timestamp",
    imageContent.updatedAt.length > 0,
  );
}
