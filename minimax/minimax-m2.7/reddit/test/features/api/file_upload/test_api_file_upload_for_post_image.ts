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
 * Test file upload for post image scenario.
 * 1. Create a new member account via join
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create a text post
 * 5. Upload a valid WebP image for the post
 * 6. Validate response with file metadata
 */
export async function test_api_file_upload_for_post_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Create a new connection with the token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      userConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditClonePostTextContent.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(post);
  // 5. Prepare valid WebP image data
  // Create a minimal valid WebP image (smallest valid WebP: ~26 bytes for RIFF header + WEBP + VP8 + size)
  // We'll create a more substantial image that meets the 1KB minimum
  const width = 100;
  const height = 100;
  // Create a simple canvas-based image data
  // For a valid WebP, we need RIFF....WEBPVP8 ........
  // Simple WebP header for a minimal image
  const canvas = {
    width: width,
    height: height,
  };
  // Create a minimal valid WebP file (lossy) with proper structure
  // WebP header: RIFF + 4-byte size + WEBP
  // VP8 chunk: VP8 + 4-byte size + frame data
  const webpHeader = new Uint8Array([
    0x52,
    0x49,
    0x46,
    0x46, // RIFF
    0x00,
    0x00,
    0x00,
    0x00, // Size (placeholder, will be updated)
    0x57,
    0x45,
    0x42,
    0x50, // WEBP
  ]);
  // VP8 lossy bitstream header
  const vp8Signature = new Uint8Array([
    0x56,
    0x50,
    0x38,
    0x20, // VP8
  ]);
  // Create a simple VP8 frame with header
  // Frame tag + key frame + width/height
  const frameData = new Uint8Array([
    0x9d,
    0x01,
    0x2a, // Frame tag (key frame indicator)
    0x64,
    0x00, // Width (100 = 0x64)
    0x64,
    0x00, // Height (100 = 0x64)
  ]);
  // Add some padding/empty data to meet 1KB minimum
  const paddingSize =
    1024 - (webpHeader.length + 4 + vp8Signature.length + 4 + frameData.length);
  const padding = new Uint8Array(paddingSize);
  // Calculate total size
  const totalSize =
    4 + vp8Signature.length + 4 + frameData.length + padding.length;
  const sizeBytes = new Uint8Array([
    totalSize & 0xff,
    (totalSize >> 8) & 0xff,
    (totalSize >> 16) & 0xff,
    (totalSize >> 24) & 0xff,
  ]);
  // Combine all parts
  const vp8Chunk = new Uint8Array([
    ...vp8Signature,
    ...sizeBytes,
    ...frameData,
    ...padding,
  ]);
  // Update RIFF size
  const riffSize = 4 + vp8Chunk.length;
  webpHeader[4] = riffSize & 0xff;
  webpHeader[5] = (riffSize >> 8) & 0xff;
  webpHeader[6] = (riffSize >> 16) & 0xff;
  webpHeader[7] = (riffSize >> 24) & 0xff;
  // Combine RIFF header with VP8 chunk
  const webpData = new Uint8Array([...webpHeader, ...vp8Chunk]);
  // Convert to base64
  let base64String = "";
  for (let i = 0; i < webpData.length; i++) {
    base64String += String.fromCharCode(webpData[i]);
  }
  const base64Encoded = btoa(base64String);
  // 6. Upload the file for the post
  const file = await generate_random_reddit_clone_member_files_create(
    userConnection,
    {
      body: {
        file_data: base64Encoded,
        mime_type: "image/webp",
        original_filename: "post_image.webp",
        target_id: post.id,
        target_type: "post",
      } satisfies IRedditCloneFile.ICreate,
    },
  );
  typia.assert(file);
  // 7. Validate response
  TestValidator.equals("file id exists", file.id !== null, true);
  TestValidator.equals(
    "original filename matches",
    file.originalFilename,
    "post_image.webp",
  );
  TestValidator.equals("mime type matches", file.mimeType, "image/webp");
  TestValidator.predicate(
    "file size within range",
    file.fileSize >= 1024 && file.fileSize <= 5242880,
  );
  TestValidator.predicate(
    "status is valid",
    file.status === "pending" ||
      file.status === "scanning" ||
      file.status === "processed",
  );
  TestValidator.equals(
    "uploader is authenticated member",
    file.uploader.id,
    authorized.id,
  );
  TestValidator.predicate("has associations", file.associations.length > 0);
  // Check association details
  const postAssociation = file.associations.find(
    (assoc) => assoc.target_type === "post" && assoc.target_id === post.id,
  );
  TestValidator.predicate(
    "has post association",
    postAssociation !== undefined,
  );
  // Check thumbnails and scans are present
  TestValidator.predicate(
    "has thumbnails array",
    Array.isArray(file.thumbnails),
  );
  TestValidator.predicate("has scans array", Array.isArray(file.scans));
}
