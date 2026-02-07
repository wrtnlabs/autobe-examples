import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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

export async function test_api_post_get_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {} as ICommunityPlatformMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {} as DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  // 3. Subscribe to community
  await api.functional.communityPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        content_type: "text" as "text" | "link" | "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
      } as DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  // 5. Retrieve post
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  // 6. Validate
  TestValidator.equals("title matches input", retrievedPost.title, post.title);
  TestValidator.equals(
    "community matches",
    retrievedPost.community.id,
    community.id,
  );
  const author = typia.assert<ICommunityPlatformMember.ISummary>(
    retrievedPost.author,
  );
  TestValidator.predicate(
    "author is present",
    author !== null && author !== undefined,
  );
  TestValidator.predicate(
    "post has comments",
    retrievedPost.comments.length > 0,
  );
}
