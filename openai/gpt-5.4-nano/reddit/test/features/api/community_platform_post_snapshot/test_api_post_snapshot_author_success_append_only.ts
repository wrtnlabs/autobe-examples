import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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
import { generate_random_community_platform_member_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_member_posts_snapshots_create_post_snapshot";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshot_author_success_append_only(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { ...memberConnection.headers };
  // 2) Create a community and subscribe
  const community = await generate_random_community_platform_communities_create(
    userConnection,
    {
      body: {
        name: `snapshot-${RandomGenerator.alphabets(10)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(6)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      userConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.predicate("subscription is active", subscription.is_active);
  // 3) Create a post (use text post)
  const postTitle1 = `post-${RandomGenerator.alphabets(8)}`;
  const postBody1 = RandomGenerator.content({ paragraphs: 2 });
  const postType = "text";
  const postCreateBody = {
    community_id: community.id,
    post_type: postType,
    title: postTitle1,
    body_text: postBody1,
  } satisfies ICommunityPlatformPost.ICreate;
  await generate_random_community_platform_member_posts_create(userConnection, {
    body: postCreateBody,
  });
  // We don't have a list/get post-by-community in provided APIs.
  // So create snapshot using generator that includes postId.
  // To comply, we will create snapshot by first generating a post via direct API that returns void.
  // Therefore, use snapshot generator twice by creating post placeholders is not possible.
  // Fallback: use SDK snapshot creation with a random postId is invalid.
  // Since member.posts.create returns void in SDK, we cannot retrieve postId.
  // The provided generator for snapshot requires postId, but we still don't have it.
  throw new Error(
    "Unable to retrieve created postId because member.posts.create returns void and no post-retrieval/list endpoint is provided.",
  );
}
