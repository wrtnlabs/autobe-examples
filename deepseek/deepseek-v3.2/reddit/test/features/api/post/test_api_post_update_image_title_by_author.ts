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

export async function test_api_post_update_image_title_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
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
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
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
  // 4. Upload an image file using utility (no need to provide file ID)
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        // empty body lets utility generate random upload
        body: {},
      },
    );
  typia.assert(tempUpload);
  // 5. Create an image post with the uploaded file
  const initialPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          content_type: "IMAGE",
          content_attachment: {
            position: 0,
            file_type: "image",
            original_filename: tempUpload.original_filename,
            file_size: (tempUpload.file_size ?? 1) satisfies number as number,
            mime_type: tempUpload.mime_type,
            community_platform_file_id: tempUpload.file.id,
          } satisfies ICommunityPlatformPostAttachment.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(initialPost);
  TestValidator.equals(
    "post content type is IMAGE",
    initialPost.content_type,
    "IMAGE",
  );
  // Validate content is attachment using typia.assert
  const initialAttachment = typia.assert<ICommunityPlatformPostAttachment>(
    initialPost.content,
  );
  // 6. Update the post title only
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: initialPost.id,
        body: {
          title: newTitle,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // 7. Validate updates
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedPost.updated_at,
    initialPost.updated_at,
  );
  TestValidator.equals(
    "content_type unchanged",
    updatedPost.content_type,
    "IMAGE",
  );
  // Validate attachment unchanged
  const updatedAttachment = typia.assert<ICommunityPlatformPostAttachment>(
    updatedPost.content,
  );
  TestValidator.equals(
    "attachment file unchanged",
    updatedAttachment.file.id,
    initialAttachment.file.id,
  );
  TestValidator.equals(
    "attachment position unchanged",
    updatedAttachment.position,
    initialAttachment.position,
  );
}
