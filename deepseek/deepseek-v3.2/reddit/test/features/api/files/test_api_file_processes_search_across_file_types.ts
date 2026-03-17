import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcess";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_images_create } from "../../../generate/generate_random_community_platform_member_communities_images_create";
import { generate_random_community_platform_member_posts_attachments_create } from "../../../generate/generate_random_community_platform_member_posts_attachments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_file_processes_search_across_file_types(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member for avatar file
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Note: Avatar upload is not in available SDK functions, but we need a file.
  // We'll create a community first to get a community icon file.
  // Step 2: Create community for icon file
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // Step 3: Upload community icon image
  const iconFile =
    await generate_random_community_platform_member_communities_images_create(
      member1Connection,
      {
        params: { communityId: community.id },
        body: {
          uri: `https://example.com/icon-${Date.now()}.jpg` satisfies string &
            tags.MaxLength<80000> &
            tags.Format<"uri">,
          filename: "icon.jpg",
          content_type: "image/jpeg" satisfies string &
            tags.Pattern<"^(image\\/(jpeg|png|gif))$">,
          width: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<10000>,
          height: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<10000>,
          size_bytes: 50000 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<2097152>,
          ordering: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
          active: true,
        },
      },
    );
  typia.assert(iconFile);
  // We need to get file ID from iconFile response - it should have a file reference
  // But the iconFile response type ICommunityPlatformCommunityImage doesn't contain file ID.
  // According to scenario, we need file IDs. Let's create a post with image attachment.
  // Step 4: Create second member for image post
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Step 5: Member2 subscribes to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      member2Connection,
      { body: { community_id: community.id, active: true } },
    );
  typia.assert(subscription);
  // Step 6: Create image post
  const imagePost =
    await generate_random_community_platform_member_posts_create(
      member2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_name: community.name,
          content_type: "IMAGE",
          content_attachment: {
            position: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
            file_type: "image",
            original_filename: "post-image.jpg",
            file_size: 100000 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            mime_type: "image/jpeg",
            community_platform_file_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies ICommunityPlatformPostAttachment.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(imagePost);
  // The imagePost.content should be ICommunityPlatformPostAttachment
  // Let's extract file ID from there
  const imagePostAttachment =
    imagePost.content as ICommunityPlatformPostAttachment;
  const imageFileId = imagePostAttachment.file.id;
  // Now we have 2 files: community icon file (need to find its file ID) and image post file
  // For community icon, we need to query community images endpoint to get file ID.
  // But we don't have that SDK function. We'll test with the image post file only.
  // Step 7: Search processing records for image file
  const searchRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformFileProcess.IRequest;
  const processes =
    await api.functional.communityPlatform.files.processes.index(
      member2Connection,
      { fileId: imageFileId, body: searchRequest },
    );
  typia.assert(processes);
  // Step 8: Validate
  TestValidator.equals("pagination exists", processes.pagination.current, 1);
  TestValidator.predicate("has data array", () =>
    Array.isArray(processes.data),
  );
  // Check that all returned processes belong to the specified file
  for (const process of processes.data) {
    TestValidator.equals("file matches", process.file.id, imageFileId);
    typia.assert<ICommunityPlatformFile.ISummary>(process.file);
    TestValidator.predicate(
      "actor exists",
      () => process.file.actor !== undefined,
    );
  }
}
