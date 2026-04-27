import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_profile_posts_view_another_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password: "password123!@#",
    },
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community (required for post creation)
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 4. Member A creates 3 posts of different types (text, link, image)
  const createdPosts: ICommunityPlatformPost[] = [];
  const postConfigs: Array<{
    type: "text" | "link" | "image";
    overrides: object;
  }> = [
    {
      type: "text",
      overrides: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
    {
      type: "link",
      overrides: {
        url: typia.random<string & tags.Format<"uri">>(),
      },
    },
    {
      type: "image",
      overrides: {
        imageUri: typia.random<string & tags.Format<"uri">>(),
      },
    },
  ];
  for (const config of postConfigs) {
    const post = await generate_random_community_platform_member_posts_create(
      memberAConnection,
      {
        body: {
          communityId: community.id,
          type: config.type,
          title: `E2E Test Post - ${RandomGenerator.alphabets(10)}`,
          ...config.overrides,
        } as DeepPartial<ICommunityPlatformPost.ICreate>,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }
  // 5. Member B setup (the viewer)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password: "password456!@#",
    },
  });
  typia.assert(memberB);
  // 6. Member B views Member A's profile posts (default pagination)
  const page =
    await api.functional.communityPlatform.member.profiles.posts.index(
      memberBConnection,
      {
        memberId: memberA.id,
        body: {
          sort: "new",
          limit: 20,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(page);
  // 7. Validate: all posts belong to Member A with correct community
  TestValidator.predicate(
    "page contains at least the 3 posts created by Member A",
    page.data.length >= 3,
  );
  for (const summary of page.data) {
    TestValidator.equals("author is Member A", summary.author.id, memberA.id);
    TestValidator.equals(
      "community name matches created community",
      summary.community.name,
      community.name,
    );
  }
  // 8. Validate pagination with a specific limit
  const limitedPage =
    await api.functional.communityPlatform.member.profiles.posts.index(
      memberBConnection,
      {
        memberId: memberA.id,
        body: {
          sort: "new",
          limit: 2,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(limitedPage);
  TestValidator.predicate(
    "pagination limit of 2 is respected",
    limitedPage.data.length <= 2,
  );
}
