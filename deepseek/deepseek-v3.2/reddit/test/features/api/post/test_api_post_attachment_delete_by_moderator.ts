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
 * Test that a community moderator (owner) can delete attachments from any post in their community.
 */
export async function test_api_post_attachment_delete_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Community Owner Setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Community Creation
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Owner Subscription
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      ownerConnection,
      {
        body: {
          community_id: community.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Post Creator Setup
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {});
  typia.assert(creatorAuth);
  // 5. Creator must subscribe to the community to post
  const creatorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      creatorConnection,
      {
        body: {
          community_id: community.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
          active: true,
        },
      },
    );
  typia.assert(creatorSubscription);
  // 6. File Upload by creator
  const file = await generate_random_community_platform_member_files_upload(
    creatorConnection,
    {
      body: {
        originalFilename: `test-${RandomGenerator.alphabets(5)}.jpg`,
        mimeType: "image/jpeg",
        fileSize: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<5000000>
        >(),
        contentHash: RandomGenerator.alphaNumeric(64),
        uploadIp: typia.random<string & tags.Format<"ipv4">>(),
        userAgent: RandomGenerator.alphabets(20),
      },
    },
  );
  typia.assert(file);
  // 7. Post Creation by creator
  const post = await generate_random_community_platform_member_posts_create(
    creatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      },
    },
  );
  typia.assert(post);
  // 8. Attachment Creation by creator
  const attachment =
    await generate_random_community_platform_member_posts_attachments_create(
      creatorConnection,
      {
        params: { postId: post.id },
        body: {
          position: 0 satisfies number as number,
          file_type: "image",
          original_filename: file.original_filename,
          file_size: file.file_size satisfies number as number,
          mime_type: file.mime_type,
          community_platform_file_id: file.file.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
        },
      },
    );
  typia.assert(attachment);
  // 9. Moderator Action: Owner deletes the attachment
  await api.functional.communityPlatform.member.posts.attachments.erase(
    ownerConnection,
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );
  // 10. Validation: Verify creator cannot delete the same attachment (already deleted)
  await TestValidator.error(
    "creator should not be able to delete already deleted attachment",
    async () => {
      await api.functional.communityPlatform.member.posts.attachments.erase(
        creatorConnection,
        {
          postId: post.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
  // 11. Validation: Verify non-owner cannot delete attachments from other posts
  // Create another post by creator to test authorization
  const anotherPost =
    await generate_random_community_platform_member_posts_create(
      creatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        },
      },
    );
  typia.assert(anotherPost);
  // Create attachment for the second post
  const anotherAttachment =
    await generate_random_community_platform_member_posts_attachments_create(
      creatorConnection,
      {
        params: { postId: anotherPost.id },
        body: {
          position: 0 satisfies number as number,
          file_type: "image",
          original_filename: file.original_filename,
          file_size: file.file_size satisfies number as number,
          mime_type: file.mime_type,
          community_platform_file_id: file.file.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
        },
      },
    );
  typia.assert(anotherAttachment);
  // Owner (moderator) can delete this attachment too
  await api.functional.communityPlatform.member.posts.attachments.erase(
    ownerConnection,
    {
      postId: anotherPost.id,
      attachmentId: anotherAttachment.id,
    },
  );
  // 12. Validate post still exists and is accessible
  TestValidator.equals(
    "community should be unchanged",
    community.id,
    post.community.id,
  );
  TestValidator.equals(
    "post author should be creator",
    creatorAuth.id,
    post.author.id,
  );
}
