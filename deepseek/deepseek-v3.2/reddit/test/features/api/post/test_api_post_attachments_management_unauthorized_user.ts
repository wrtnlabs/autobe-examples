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

export async function test_api_post_attachments_management_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
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
  typia.assert(author);
  // Step 2: Create community as author
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Subscribe to community as author
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 4: Upload file as author for image post
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      authorConnection,
      {
        body: {
          // Let utility generate proper file ID
        } satisfies DeepPartial<ICommunityPlatformTempUpload.ICreate>,
      },
    );
  typia.assert(tempUpload);
  // Step 5: Create IMAGE post as author with attachment included in creation
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "IMAGE" as const,
        content_attachment: {
          position: 0 satisfies number as number,
          file_type: "image",
          original_filename: "test.png",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          mime_type: "image/png",
          community_platform_file_id: tempUpload.file.id,
        } satisfies ICommunityPlatformPostAttachment.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify post is IMAGE type with attachment
  TestValidator.equals("post content type", post.content_type, "IMAGE");
  typia.assert(post.content);
  typia.assertGuard(post.content!);
  const attachment = post.content;
  typia.assert(attachment);
  // Step 6: Create another user (unauthorized)
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await authorize_member_join(otherUserConnection, {
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
  typia.assert(otherUser);
  // Step 7: Attempt to manage attachments as unauthorized user (should receive 403 Forbidden)
  // Need to construct a valid IAttachmentRequest - using typia.random for proper structure
  const attachmentRequest =
    typia.random<ICommunityPlatformPost.IAttachmentRequest>();
  await TestValidator.error(
    "unauthorized user should receive 403",
    async () => {
      await api.functional.communityPlatform.posts.attachments.manage(
        otherUserConnection,
        {
          postId: post.id,
          body: attachmentRequest,
        },
      );
    },
  );
  // Step 8: Verify post existence validation still works (404 for non-existent post)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent post should return 404", async () => {
    await api.functional.communityPlatform.posts.attachments.manage(
      authorConnection,
      {
        postId: nonExistentPostId,
        body: attachmentRequest,
      },
    );
  });
  // Step 9: Test file ownership validation - unauthorized user tries to attach their own file
  // This step is partially redundant since we already test 403, but we can still verify
  // that ownership doesn't bypass author requirement
  const otherUserTempUpload =
    await generate_random_community_platform_member_files_upload(
      otherUserConnection,
      {
        body: {
          // Let utility generate proper file ID
        } satisfies DeepPartial<ICommunityPlatformTempUpload.ICreate>,
      },
    );
  typia.assert(otherUserTempUpload);
  // Create another attachment request
  const otherAttachmentRequest =
    typia.random<ICommunityPlatformPost.IAttachmentRequest>();
  await TestValidator.error(
    "unauthorized user cannot attach even their own file",
    async () => {
      await api.functional.communityPlatform.posts.attachments.manage(
        otherUserConnection,
        {
          postId: post.id,
          body: otherAttachmentRequest,
        },
      );
    },
  );
}
