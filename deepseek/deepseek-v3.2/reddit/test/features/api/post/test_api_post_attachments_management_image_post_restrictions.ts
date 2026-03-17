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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_post_attachments_management_image_post_restrictions(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription active", subscription.active, true);
  // Upload image file
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {},
    );
  typia.assert(tempUpload);
  TestValidator.equals("upload status", tempUpload.status, "pending");
  // Create IMAGE post with uploaded image
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "IMAGE" as const,
        content_attachment: {
          position: 0,
          file_type: "image",
          original_filename: "test-image.jpg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          mime_type: "image/jpeg",
          community_platform_file_id: tempUpload.file.id,
        } satisfies ICommunityPlatformPostAttachment.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post content type", post.content_type, "IMAGE");
  // Get the primary attachment ID
  const attachment = post.content as ICommunityPlatformPostAttachment;
  const attachmentId = attachment.id;
  // Test 1: Attempt to remove primary image attachment (should fail)
  await TestValidator.error("remove primary image attachment", async () => {
    await api.functional.communityPlatform.posts.attachments.manage(
      memberConnection,
      {
        postId: post.id,
        body: {
          attachments: [
            {
              id: attachmentId,
              position: 0,
              deleted_at: new Date().toISOString(),
            } as any,
          ],
        } satisfies ICommunityPlatformPost.IAttachmentRequest,
      },
    );
  });
  // Test 2: Attempt to replace primary image attachment with different file (should fail)
  await TestValidator.error("replace primary image attachment", async () => {
    const secondTempUpload =
      await generate_random_community_platform_member_files_upload(
        memberConnection,
        {},
      );
    typia.assert(secondTempUpload);
    await api.functional.communityPlatform.posts.attachments.manage(
      memberConnection,
      {
        postId: post.id,
        body: {
          attachments: [
            {
              id: attachmentId,
              position: 0,
              community_platform_file_id: secondTempUpload.file.id,
              file_type: "image",
              original_filename: "replacement.jpg",
              file_size: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              mime_type: "image/jpeg",
            } as any,
          ],
        } satisfies ICommunityPlatformPost.IAttachmentRequest,
      },
    );
  });
  // Test 3: Valid position update (should succeed)
  const updatedPost =
    await api.functional.communityPlatform.posts.attachments.manage(
      memberConnection,
      {
        postId: post.id,
        body: {
          attachments: [
            {
              id: attachmentId,
              position: 1,
            } as any,
          ],
        } satisfies ICommunityPlatformPost.IAttachmentRequest,
      },
    );
  typia.assert(updatedPost);
  TestValidator.equals("position updated", updatedPost.id, post.id);
  // Test 4: File ownership validation by attempting to use another member's file
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {});
  const otherTempUpload =
    await generate_random_community_platform_member_files_upload(
      otherMemberConnection,
      {},
    );
  typia.assert(otherTempUpload);
  await TestValidator.error("use another member's file", async () => {
    await api.functional.communityPlatform.posts.attachments.manage(
      memberConnection,
      {
        postId: post.id,
        body: {
          attachments: [
            {
              position: 2,
              file_type: "image" as "image" | "document" | "video" | "audio",
              original_filename: "foreign.jpg",
              file_size: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              mime_type: "image/jpeg",
              community_platform_file_id: otherTempUpload.file.id,
            } as any,
          ],
        } satisfies ICommunityPlatformPost.IAttachmentRequest,
      },
    );
  });
  // Test 5: Position uniqueness enforcement (should fail)
  await TestValidator.error("duplicate position", async () => {
    await api.functional.communityPlatform.posts.attachments.manage(
      memberConnection,
      {
        postId: post.id,
        body: {
          attachments: [
            {
              id: attachmentId,
              position: 1,
            } as any,
            {
              id: attachmentId,
              position: 1,
            } as any,
          ],
        } satisfies ICommunityPlatformPost.IAttachmentRequest,
      },
    );
  });
}
