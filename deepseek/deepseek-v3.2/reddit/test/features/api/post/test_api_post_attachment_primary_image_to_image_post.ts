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

export async function test_api_post_attachment_primary_image_to_image_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
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
  typia.assert(authorizedMember);
  // 2. Create community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      { body: communityBody },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscriptionBody = {
    community_id: community.id,
    active: true,
  } satisfies ICommunityPlatformSubscription.ICreate;
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);
  // 4. Create IMAGE-type post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    community_name: community.name,
    content_type: "IMAGE" as const,
    content_attachment: undefined,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    { body: postBody },
  );
  typia.assert(post);
  TestValidator.equals(
    "post content_type should be IMAGE",
    post.content_type,
    "IMAGE",
  );
  // 5. Upload file using utility function (simulates file upload)
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      { body: undefined },
    );
  typia.assert(tempUpload);
  // 6. Attach uploaded image to post as primary content
  const attachmentBody = {
    position: 0 satisfies number as number,
    file_type: "image",
    original_filename: tempUpload.original_filename satisfies string as string,
    file_size: tempUpload.file_size satisfies number as number,
    mime_type: tempUpload.mime_type satisfies string as string,
    community_platform_file_id: tempUpload.file.id satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">,
  } satisfies ICommunityPlatformPostAttachment.ICreate;
  const attachment =
    await generate_random_community_platform_member_posts_attachments_create(
      memberConnection,
      {
        body: attachmentBody,
        params: { postId: post.id },
      },
    );
  typia.assert(attachment);
  // Validate attachment is associated with the post
  TestValidator.equals(
    "attachment post ID matches",
    attachment.post.id,
    post.id,
  );
  TestValidator.equals(
    "attachment file ID matches",
    attachment.file.id,
    tempUpload.file.id,
  );
  TestValidator.equals(
    "attachment file_type is image",
    attachment.file_type,
    "image",
  );
  TestValidator.equals("attachment position is 0", attachment.position, 0);
}
