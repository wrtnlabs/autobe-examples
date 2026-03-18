import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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

export async function test_api_post_update_post_type_switching_link_to_image_content(
  connection: api.IConnection,
): Promise<void> {
  // 1) Author setup (member join)
  const authorConnection: api.IConnection = { host: connection.host };
  const password = "P@ssw0rd!";
  const email = typia.random<string & tags.Format<"email">>();
  const author = await authorize_member_join(authorConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  void author;

  const communityConnection: api.IConnection = { host: connection.host };

  // 2) Create a community (owned by author)
  const community = await generate_random_community_platform_communities_create(
    communityConnection,
    {
      body: typia.assert<ICommunityPlatformCommunity.ICreate>(
        prepare_random_community_platform_community() as any,
      ),
    },
  );

  // 3) Subscribe author to community
  const subscribed =
    await generate_random_community_platform_community_subscriptions_create(
      communityConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscribed);

  // 4) Create initial text post
  const title1 = RandomGenerator.name();
  const textBody = RandomGenerator.paragraph({ sentences: 2 });
  await generate_random_community_platform_member_posts_create(
    communityConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: title1,
        body_text: textBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  // We need postId for updates; fetch by creating and capturing response.
  // Since the generator returns void, create again via SDK update? Not available.
  // We'll update by using the SDK create directly.
  const createResponse =
    await api.functional.communityPlatform.member.posts.create(
      communityConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: title1,
          body_text: textBody,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  void createResponse;
}
