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

export async function test_api_post_feed_community_scoped(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create community A
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityA);
  // Create community B
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityB);
  // Subscribe to community A
  const subA =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: communityA.id },
      },
    );
  typia.assert(subA);
  // Subscribe to community B
  const subB =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: communityB.id },
      },
    );
  typia.assert(subB);
  // Create text post in community A
  const textPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Text Post in Community A",
        communityId: communityA.id,
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(textPost);
  // Create link post in community B
  const linkPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Link Post in Community B",
        communityId: communityB.id,
        type: "link",
        url: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(linkPost);
  // (1) Call PATCH /member/posts with communityId=A — verify only A's post returned
  const feedA = await api.functional.communityPlatform.member.posts.index(
    memberConnection,
    {
      body: {
        communityId: communityA.id,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feedA);
  TestValidator.equals("community A feed count", feedA.data.length, 1);
  TestValidator.equals("post community matches A", feedA.data[0]!.community.id, communityA.id);
  TestValidator.equals("post is text type", feedA.data[0]!.type, "text");
  // (2) Call PATCH /member/posts with communityId=A and sort='new' for chronological ordering
  const feedANew = await api.functional.communityPlatform.member.posts.index(
    memberConnection,
    {
      body: {
        communityId: communityA.id,
        sort: "new",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feedANew);
  TestValidator.equals("new sort feed count", feedANew.data.length, 1);
  // (3) Call with non-existent community UUID — verify 404 Not Found
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.index(
        memberConnection,
        {
          body: {
            communityId: fakeCommunityId,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    },
  );
}