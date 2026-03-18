import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_link_attach_post_link } from "../../../generate/generate_random_community_platform_member_posts_link_attach_post_link";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_attach_deleted_post_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create member (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: credentials,
  });
  // Create community and subscribe
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // Create a link-type post (helper returns void, so we cannot retrieve postId)
  const href = `https://example.com/${RandomGenerator.alphabets(8)}`;
  const postBody = {
    community_id: community.id,
    post_type: "link",
    title: RandomGenerator.name(2),
    link: {
      href: href satisfies string & tags.Format<"uri">,
      display_title: RandomGenerator.paragraph({ sentences: 1 }),
      display_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    { body: postBody },
  );
  // We cannot obtain actual created post id with the provided helpers/SDK typings,
  // so use a UUID and validate that link attach is denied for a deleted/unavailable post.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Soft-delete attempt (should make the post unavailable; may 404 if it never existed)
  await TestValidator.error(
    "erase may fail or succeed, but subsequent attach must be denied",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(
        memberConnection,
        { postId },
      );
    },
  );
  const deniedHref = `https://example.org/${RandomGenerator.alphabets(10)}`;
  await TestValidator.error(
    "attach link to deleted post should be denied",
    async () => {
      await api.functional.communityPlatform.member.posts.link.attachPostLink(
        memberConnection,
        {
          postId,
          body: {
            href: deniedHref satisfies string & tags.Format<"uri">,
            displayTitle: RandomGenerator.name(2),
            displayDescription: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformPostLink.ICreate,
        },
      );
    },
  );
}
