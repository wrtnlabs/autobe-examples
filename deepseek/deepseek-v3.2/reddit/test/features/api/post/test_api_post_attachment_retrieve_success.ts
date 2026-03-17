import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_files_upload } from "../../../generate/generate_random_community_platform_member_files_upload";
import { generate_random_community_platform_member_posts_attachments_create } from "../../../generate/generate_random_community_platform_member_posts_attachments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

/**
 * Test retrieving a valid post attachment that has been uploaded and attached to a post.
 * 1. Create a member account and authenticate
 * 2. Create a community as the member
 * 3. Subscribe to the community (required for posting)
 * 4. Create a text post (type TEXT initially)
 * 5. Upload a file for attachment
 * 6. Attach the uploaded file to the post
 * 7. Retrieve the attachment details using the GET endpoint
 * 8. Verify attachment metadata matches the upload
 */
export async function test_api_post_attachment_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post (type TEXT initially)
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Upload file
  const fileUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        body: {
          communityPlatformFileId: typia.random<string & tags.Format<"uuid">>(),
          originalFilename: RandomGenerator.alphabets(8) + ".png",
          mimeType: "image/png",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<500000>
          >(),
          contentHash: RandomGenerator.alphaNumeric(64),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: RandomGenerator.alphaNumeric(50),
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(fileUpload);
  // 6. Attach file to post
  const attachment =
    await generate_random_community_platform_member_posts_attachments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          position: 0 satisfies number as number,
          file_type: "image",
          original_filename: fileUpload.original_filename,
          file_size: fileUpload.file_size satisfies number as number,
          mime_type: fileUpload.mime_type,
          community_platform_file_id: fileUpload.file.id,
        } satisfies ICommunityPlatformPostAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 7. Retrieve attachment using GET endpoint
  const retrieved = await api.functional.communityPlatform.posts.attachments.at(
    { host: connection.host },
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );
  typia.assert(retrieved);
  // 8. Validate attachment metadata
  TestValidator.equals("attachment ID matches", retrieved.id, attachment.id);
  TestValidator.equals(
    "position matches",
    retrieved.position,
    attachment.position,
  );
  TestValidator.equals(
    "file_type matches",
    retrieved.file_type,
    attachment.file_type,
  );
  TestValidator.equals(
    "original_filename matches",
    retrieved.original_filename,
    attachment.original_filename,
  );
  TestValidator.equals(
    "file_size matches",
    retrieved.file_size,
    attachment.file_size,
  );
  TestValidator.equals(
    "mime_type matches",
    retrieved.mime_type,
    attachment.mime_type,
  );
  TestValidator.equals("post ID matches", retrieved.post.id, post.id);
  TestValidator.predicate(
    "file has storage path",
    retrieved.file.storage_path.length > 0,
  );
  TestValidator.equals(
    "file ID matches",
    retrieved.file.id,
    fileUpload.file.id,
  );
}
