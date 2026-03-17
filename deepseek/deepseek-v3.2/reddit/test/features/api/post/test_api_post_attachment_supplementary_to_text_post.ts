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
 * Test the attachment of a supplementary file to a text post.
 * 1. Member authenticates via join to establish session.
 * 2. Member creates a community.
 * 3. Member subscribes to that community.
 * 4. Member creates a text post in that community with title and text content.
 * 5. Member uploads a file (e.g., image) via the file upload endpoint, receiving a file ID.
 * 6. Member attaches the uploaded file to the post via the target operation, specifying position, file type, original filename, file size, mime type, and the file ID.
 *
 * Validate that the attachment is created successfully with proper metadata linking to the post and the uploaded file. The response should contain the attachment ID, file details, position, and timestamps. Ensure the post author is the authenticated member and subscription validation passes.
 *
 * This scenario tests the core business workflow of adding supplementary content to an existing post.
 */
export async function test_api_post_attachment_supplementary_to_text_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
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
        },
      },
    );
  typia.assert(subscription);
  // 4. Create text post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.content({ paragraphs: 2 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 5. Upload file
  const fileUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {},
    );
  typia.assert(fileUpload);
  // 6. Attach file to post
  const attachment =
    await api.functional.communityPlatform.member.posts.attachments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          position: 0,
          file_type: "image",
          original_filename: "test-image.jpg",
          file_size: fileUpload.file_size satisfies number as number,
          mime_type: "image/jpeg",
          community_platform_file_id: fileUpload.file.id,
        } satisfies ICommunityPlatformPostAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Validations
  TestValidator.predicate("attachment has ID", attachment.id.length > 0);
  TestValidator.equals("position matches", attachment.position, 0);
  TestValidator.equals("file_type matches", attachment.file_type, "image");
  TestValidator.equals(
    "original_filename matches",
    attachment.original_filename,
    "test-image.jpg",
  );
  TestValidator.equals(
    "file_size matches",
    attachment.file_size,
    (fileUpload.file_size satisfies number as number) satisfies number as number,
  );
  TestValidator.equals("mime_type matches", attachment.mime_type, "image/jpeg");
  TestValidator.equals("post ID matches", attachment.post.id, post.id);
  TestValidator.equals(
    "file ID matches",
    attachment.file.id,
    fileUpload.file.id,
  );
  TestValidator.predicate("has created_at", attachment.created_at.length > 0);
  TestValidator.predicate("has updated_at", attachment.updated_at.length > 0);
  TestValidator.equals("deleted_at is null", attachment.deleted_at, null);
}
