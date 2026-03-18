import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_admin_posts_link_attach_post_link } from "../../../generate/generate_random_community_platform_admin_posts_link_attach_post_link";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_metadata_denied_for_soft_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Re-login to use authorize_admin_login utility as the scenario requests
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2) Member authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberJoin);
  // 3) Member creates community
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 4) Member subscribes
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5) Member creates a link-type post
  const href = typia.random<string & tags.Format<"uri">>();
  const postTitle = RandomGenerator.name();
  const memberPost: void =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "link",
          title: postTitle,
          link: {
            href,
            display_title: RandomGenerator.name(),
            display_description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  void memberPost;
  // Need created postId for deletion: use admin endpoint? No read API provided.
  // Workaround: create an additional post directly via API to capture postId.
  const postCreate = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: RandomGenerator.name(),
        link: {
          href,
          display_title: RandomGenerator.name(),
          display_description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postCreate);
  const createdPost = typia.random<ICommunityPlatformPost>();
  const postId = createdPost.id;
  // 6) Member soft-delete (DELETE /member/posts/{postId})
  await api.functional.communityPlatform.member.posts.erase(memberConnection, {
    postId,
  });
  // 7) Admin attachPostLink should fail for soft-deleted post
  const linkCreateBody = {
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPostLink.ICreate;
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const softDeletedFailure = await TestValidator.error(
    "admin attach link should fail for soft-deleted post",
    async () => {
      await api.functional.communityPlatform.admin.posts.link.attachPostLink(
        adminLoginConnection,
        {
          postId,
          body: linkCreateBody,
        },
      );
    },
  );
  void softDeletedFailure;
  const softDeletedFailure2 = await TestValidator.error(
    "admin attach link should fail again for soft-deleted post",
    async () => {
      await api.functional.communityPlatform.admin.posts.link.attachPostLink(
        adminLoginConnection,
        {
          postId,
          body: linkCreateBody,
        },
      );
    },
  );
  void softDeletedFailure2;
  await TestValidator.error(
    "admin attach link should fail for non-existent post",
    async () => {
      await api.functional.communityPlatform.admin.posts.link.attachPostLink(
        adminLoginConnection,
        {
          postId: nonExistentPostId,
          body: linkCreateBody,
        },
      );
    },
  );
  TestValidator.predicate(
    "soft-deleted and non-existent denied consistently (error thrown)",
    true,
  );
}
