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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_links_create } from "../../../generate/generate_random_community_platform_member_posts_links_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_link_metadata_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create unauthorized member
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorized = await authorize_member_join(unauthorizedConnection, {});
  typia.assert(unauthorized);
  // 3. Author creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Author subscribes to community
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
  // 5. Author creates LINK-type post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "LINK",
        content_link: {
          url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"url">
          >(),
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Author adds link metadata
  const linkMetadata =
    await generate_random_community_platform_member_posts_links_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"url">
          >(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          thumbnail_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"url">
          >(),
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(linkMetadata);
  // 7. Unauthorized member attempts to delete link metadata
  await TestValidator.error(
    "unauthorized user cannot delete link metadata",
    async () => {
      await api.functional.communityPlatform.member.posts.link.erase(
        unauthorizedConnection,
        {
          postId: post.id,
        },
      );
    },
  );
  // 8. Verify author can still delete (optional verification)
  // This confirms the endpoint works correctly for authorized users
  await api.functional.communityPlatform.member.posts.link.erase(
    authorConnection,
    {
      postId: post.id,
    },
  );
}
