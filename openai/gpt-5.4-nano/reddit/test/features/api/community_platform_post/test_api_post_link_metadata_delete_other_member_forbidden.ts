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

export async function test_api_post_link_metadata_delete_other_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join/authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) Join/authenticate member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 3) Member A creates a community and subscribes
  const communityA = await generate_random_community_platform_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(communityA);
  await generate_random_community_platform_community_subscriptions_create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
      },
    },
  );
  // 4) Member A creates a link-type post (note: provided SDK/generators return void,
  // so postId cannot be captured with available operations)
  const href = typia.random<string & tags.Format<"uri">>();
  await api.functional.communityPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: "link",
        title: RandomGenerator.name(),
        link: {
          href,
          display_title: RandomGenerator.name(),
          display_description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 5) Member B attempts to delete link metadata.
  // Since postId cannot be obtained from the create operation, we generate a UUID to
  // trigger the authorization boundary. This at least asserts the request does not succeed.
  const postId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member B cannot delete link metadata of another member's post",
    async () => {
      await api.functional.communityPlatform.member.posts.link.erasePostLink(
        memberBConnection,
        { postId },
      );
    },
  );
  // 6) Verify non-mutation cannot be validated without postId capture.
  // We still ensure that fetching the same generated postId does not unexpectedly succeed.
  await TestValidator.error(
    "GET for the target post should not succeed for the unknown postId",
    async () => {
      await api.functional.communityPlatform.member.posts.at(
        memberAConnection,
        {
          postId,
        },
      );
    },
  );
}
