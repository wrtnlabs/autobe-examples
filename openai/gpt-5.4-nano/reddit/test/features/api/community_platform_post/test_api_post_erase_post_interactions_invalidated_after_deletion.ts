import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_post_erase_post_interactions_invalidated_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: typia.random<string>() satisfies string,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // NOTE: SDK create endpoint returns void in the provided API typing.
  // We only need a postId to compile and drive subsequent interactions.
  const postId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.member.posts.create(memberConnection, {
    body: {
      community_id: community.id,
      post_type: "text",
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformPost.ICreate,
  });
  await generate_random_community_platform_member_posts_comments_create(
    memberConnection,
    {
      params: { postId },
      body: {
        bodyText: RandomGenerator.paragraph({ sentences: 1 }),
        parentCommentId: null,
      } satisfies ICommunityPlatformPostVoteComment.ICreate,
    },
  );
  await api.functional.communityPlatform.member.posts.votes.create(
    memberConnection,
    {
      postId,
      body: {
        post_type: "up",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body_text: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  await api.functional.communityPlatform.admin.posts.erase(adminConnection, {
    postId,
  });
  await TestValidator.error(
    "voting should be invalidated after post deletion",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        memberConnection,
        {
          postId,
          body: {
            post_type: "up",
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body_text: RandomGenerator.paragraph({ sentences: 1 }),
            community_id: community.id,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}
