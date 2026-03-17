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
 * Test updating metadata for a post attachment when authenticated user is the post author.
 * 1. Create a member account, create a community, subscribe to it
 * 2. Create a text post, attach a file
 * 3. Update attachment metadata (position, file_type, original_filename, file_size, mime_type)
 * 4. Verify the update succeeds and returns updated attachment with correct metadata
 * 5. Validate that only the author can update their own attachments
 */
export async function test_api_post_attachment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
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
  // 4. Create text post
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
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Upload file - trust utility function creates valid file
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        body: {
          originalFilename: "test-image.jpg",
          mimeType: "image/jpeg",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000>
          >(),
          contentHash: RandomGenerator.alphaNumeric(64),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: "Test-Agent/1.0",
        } satisfies DeepPartial<ICommunityPlatformTempUpload.ICreate>,
      },
    );
  typia.assert(tempUpload);
  TestValidator.predicate(
    "file upload should succeed",
    tempUpload.status !== "failed",
  );
  // 6. Attach file to post
  const attachment =
    await generate_random_community_platform_member_posts_attachments_create(
      memberConnection,
      {
        body: {
          position: 0,
          file_type: "image",
          original_filename: tempUpload.original_filename,
          file_size: tempUpload.file_size satisfies number as number,
          mime_type: tempUpload.mime_type,
          community_platform_file_id: tempUpload.file.id,
        } satisfies ICommunityPlatformPostAttachment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(attachment);
  // 7. Update attachment metadata
  const updateBody = {
    position: 1,
    file_type: "document",
    original_filename: "updated-document.pdf",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2000> & tags.Maximum<8000>
    >(),
    mime_type: "application/pdf",
  } satisfies ICommunityPlatformPostAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.communityPlatform.member.posts.attachments.update(
      memberConnection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttachment);
  // 8. Validate updated fields
  TestValidator.equals(
    "position should be updated",
    updatedAttachment.position,
    updateBody.position!,
  );
  // Fix: Use type assertion for file_type comparison
  const expectedFileType = updateBody.file_type as
    | "image"
    | "document"
    | "video"
    | "audio";
  TestValidator.equals(
    "file_type should be updated",
    updatedAttachment.file_type,
    expectedFileType,
  );
  TestValidator.equals(
    "original_filename should be updated",
    updatedAttachment.original_filename,
    updateBody.original_filename!,
  );
  TestValidator.equals(
    "file_size should be updated",
    updatedAttachment.file_size,
    updateBody.file_size!,
  );
  TestValidator.equals(
    "mime_type should be updated",
    updatedAttachment.mime_type,
    updateBody.mime_type!,
  );
  // 9. Validate unchanged fields remain
  TestValidator.equals(
    "file id should remain unchanged",
    updatedAttachment.file.id,
    attachment.file.id,
  );
  TestValidator.equals(
    "post id should remain unchanged",
    updatedAttachment.post.id,
    attachment.post.id,
  );
}
