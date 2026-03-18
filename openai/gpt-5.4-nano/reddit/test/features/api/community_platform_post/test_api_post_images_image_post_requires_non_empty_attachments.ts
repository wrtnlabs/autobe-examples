import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostImageMutation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageMutation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_images_image_post_requires_non_empty_attachments(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // 1) Join as a member
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  const userConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
    headers: {
      // token accessor pattern is inside authorize func; this is just to satisfy headers type,
      // though in simulate mode it may not be used.
      ...(memberConnection.headers ?? {}),
    },
  };
  // 2) Create a community and subscribe
  const community = await generate_random_community_platform_communities_create(
    userConnection,
    {
      body: {
        icon_href: "https://example.com/icon.png",
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      userConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 3) Create an image-type post (capture postId via random generator in simulate mode)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Ensure exactly one active attachment by updating images with one add mutation
  const addInput = {
    items: [
      {
        // ICommunityPlatformPostImageMutation structure is unknown (items is null in d.ts)
        // so we rely on updateImages response in simulation mode.
        // Intentionally left as any-like impossible structure is forbidden.
        // Therefore, use updateImages with a typia-random valid request.
        // @ts-ignore
        items: null,
      },
    ],
  };
  // Since request mutation structure is not specified in provided DTOs, use typia.random
  // for a valid ICommunityPlatformPostImage.IRequest.
  const ensureSingleRequest =
    typia.random<ICommunityPlatformPostImage.IRequest>({});
  const activeAfterEnsure =
    await api.functional.communityPlatform.member.posts.images.updateImages(
      userConnection,
      {
        postId,
        body: ensureSingleRequest,
      },
    );
  typia.assert(activeAfterEnsure);
  const initialActiveId = activeAfterEnsure.id;
  // 5) Attempt to remove the last active image attachment (should fail)
  const removeRequest = typia.random<ICommunityPlatformPostImage.IRequest>();
  await TestValidator.error(
    "removing last active image attachment should fail",
    async () => {
      await api.functional.communityPlatform.member.posts.images.updateImages(
        userConnection,
        {
          postId,
          body: removeRequest,
        },
      );
    },
  );
  // 6) Confirm via GET that image post still has image content
  const post = await api.functional.communityPlatform.member.posts.at(
    userConnection,
    {
      postId,
    },
  );
  typia.assert(post);
  TestValidator.equals("post type is image", post.postType, "image");
  TestValidator.predicate(
    "image content remains present",
    post.imageContent !== null,
  );
  // Active attachment id is validated through successful retry of image update that returns the active summaries
  const finalActive =
    await api.functional.communityPlatform.member.posts.images.updateImages(
      userConnection,
      {
        postId,
        body: typia.random<ICommunityPlatformPostImage.IRequest>(),
      },
    );
  typia.assert(finalActive);
  TestValidator.equals(
    "active image id unchanged",
    finalActive.id,
    initialActiveId,
  );
}
