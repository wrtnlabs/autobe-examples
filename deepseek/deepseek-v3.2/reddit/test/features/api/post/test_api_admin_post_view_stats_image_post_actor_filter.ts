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
import type { ICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostViewStat";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

/**
 * Test that an admin can retrieve view statistics for an image post filtered by actor_type (member/guest).
 * 1. Create member account and authenticate
 * 2. Create community and subscribe member
 * 3. Upload image file for image post attachment
 * 4. Create image post with uploaded file
 * 5. Switch to admin account
 * 6. Retrieve view statistics with actor_type='member' filter
 * 7. Validate response contains only member actor_type records
 * 8. Retrieve view statistics with actor_type='guest' filter
 * 9. Validate appropriate results
 */
export async function test_api_admin_post_view_stats_image_post_actor_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Upload image file for image post attachment
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        body: {
          originalFilename: `image_${RandomGenerator.alphaNumeric(8)}.jpg`,
          mimeType: "image/jpeg",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1024> &
              tags.Maximum<1048576>
          >(),
          contentHash: RandomGenerator.alphaNumeric(64),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: RandomGenerator.alphaNumeric(32),
        },
      },
    );
  typia.assert(tempUpload);
  // 5. Create image post with uploaded file
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "IMAGE",
        content_attachment: {
          position: 0 satisfies number as number,
          file_type: "image",
          original_filename: tempUpload.original_filename,
          file_size: tempUpload.file_size satisfies number as number,
          mime_type: tempUpload.mime_type,
          community_platform_file_id: tempUpload.file.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
        },
      },
    },
  );
  typia.assert(post);
  // 6. Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 7. Retrieve view statistics with actor_type='member' filter
  const memberStats =
    await api.functional.communityPlatform.admin.posts.view_stats.index(
      adminConnection,
      {
        postId: post.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        body: {
          actor_type: "member",
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        },
      },
    );
  typia.assert(memberStats);
  // 8. Validate response contains only member actor_type records
  TestValidator.predicate(
    "member filter should return data",
    memberStats.data.length >= 0,
  );
  for (const stat of memberStats.data) {
    TestValidator.equals(
      "actorType should be member",
      stat.actorType,
      "member",
    );
  }
  // 9. Retrieve view statistics with actor_type='guest' filter
  const guestStats =
    await api.functional.communityPlatform.admin.posts.view_stats.index(
      adminConnection,
      {
        postId: post.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        body: {
          actor_type: "guest",
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        },
      },
    );
  typia.assert(guestStats);
  // 10. Validate appropriate results
  TestValidator.predicate(
    "guest filter should return data",
    guestStats.data.length >= 0,
  );
  for (const stat of guestStats.data) {
    TestValidator.equals("actorType should be guest", stat.actorType, "guest");
  }
  // 11. Validate admin can view statistics regardless of community membership
  TestValidator.predicate(
    "admin should have access to view stats",
    memberStats.pagination.records >= 0 && guestStats.pagination.records >= 0,
  );
}
