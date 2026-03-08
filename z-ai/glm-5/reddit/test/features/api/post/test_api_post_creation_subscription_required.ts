import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_creation_subscription_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registers and creates a community
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      firstMemberConnection,
      {},
    );
  typia.assert(community);
  // 2. Second member registers (does NOT subscribe to the community)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // 3. Second member attempts to create a post in the first member's community
  // This should fail with 403 Forbidden because they are not subscribed
  await TestValidator.httpError(
    "should reject post creation without subscription",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.create(
        secondMemberConnection,
        {
          body: {
            communityId: community.id,
            title: RandomGenerator.name(),
            contentType: "text",
            textContent: RandomGenerator.paragraph({ sentences: 3 }),
            linkUrl: null,
            imageUrl: null,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}
