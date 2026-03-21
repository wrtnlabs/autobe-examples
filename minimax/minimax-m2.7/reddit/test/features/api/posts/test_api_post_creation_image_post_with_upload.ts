import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

/**
 * Test creating an image post with uploaded file.
 *
 * Steps:
 * 1. Register a new member via POST /redditClone/auth/member/join
 * 2. Create a community via POST /redditClone/member/communities
 * 3. Subscribe to the community via POST /redditClone/member/subscriptions
 * 4. Upload an image file via POST /redditClone/member/files with valid base64
 *    image data, mime_type='image/png', target_type='post'
 * 5. Create an image post via POST /redditClone/member/posts with title,
 *    communityName, type='image', and fileId from step 4
 *
 * Validations:
 * - Response returns 201
 * - Post type='image'
 * - imageFileId matches uploaded file ID
 * - vote_score and comment_count are 0
 */
export async function test_api_post_creation_image_post_with_upload(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditClonePostTextContent.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 4: Upload an image file
  // Generate a simple valid PNG base64 (1x1 pixel transparent PNG)
  // This is a minimal valid PNG file
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data: pngBase64,
        mime_type: "image/png",
        original_filename: "test_image.png",
        target_id: community.id,
        target_type: "post",
      } satisfies IRedditCloneFile.ICreate,
    },
  );
  typia.assert(uploadedFile);
  // Step 5: Create an image post
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "image",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(post);
  // Validate: Post type is 'image'
  TestValidator.equals("post type is image", post.type, "image");
  // Validate: imageFileId is defined and matches uploaded file
  TestValidator.equals(
    "imageFileId matches uploaded file",
    post.imageFileId,
    uploadedFile.id,
  );
  // Validate: vote_score is 0
  TestValidator.equals("vote_score is 0", post.vote_score, 0);
  // Validate: comment_count is 0
  TestValidator.equals("comment_count is 0", post.comment_count, 0);
}
