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

export async function test_api_profile_posts_view_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const memberId = authorized.id;
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 4. Create three posts of different types
  // 4.1 Text post
  const textPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        type: "text",
        communityId: community.id,
        title: `Text Post - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(textPost);
  // 4.2 Link post
  const linkPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        type: "link",
        communityId: community.id,
        title: `Link Post - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        url: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(linkPost);
  // 4.3 Image post
  const imagePost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          type: "image",
          communityId: community.id,
          title: `Image Post - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          imageUri: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(imagePost);
  // 5. Retrieve profile posts with default pagination
  const page =
    await api.functional.communityPlatform.member.profiles.posts.index(
      memberConnection,
      {
        memberId,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(page);
  // 6. Validate response
  TestValidator.equals("total records count", page.pagination.records, 3);
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.predicate("has data", page.data.length === 3);
  const textSummary = page.data.find((p) => p.id === textPost.id);
  TestValidator.equals("text post found", textSummary != null, true);
  typia.assertGuard(textSummary!);
  TestValidator.equals("text post title", textSummary.title, textPost.title);
  TestValidator.equals("text post type", textSummary.type, "text");
  TestValidator.equals("text post author id", textSummary.author.id, memberId);
  TestValidator.equals(
    "text post community id",
    textSummary.community.id,
    community.id,
  );
  TestValidator.equals("text post vote score", textSummary.vote_score, 0);
  TestValidator.equals("text post comment count", textSummary.comment_count, 0);
  TestValidator.predicate(
    "text post has text_preview",
    textSummary.text_preview != null,
  );
  const linkSummary = page.data.find((p) => p.id === linkPost.id);
  TestValidator.equals("link post found", linkSummary != null, true);
  typia.assertGuard(linkSummary!);
  TestValidator.equals("link post title", linkSummary.title, linkPost.title);
  TestValidator.equals("link post type", linkSummary.type, "link");
  TestValidator.equals("link post author id", linkSummary.author.id, memberId);
  TestValidator.equals(
    "link post community id",
    linkSummary.community.id,
    community.id,
  );
  TestValidator.equals("link post vote score", linkSummary.vote_score, 0);
  TestValidator.equals("link post comment count", linkSummary.comment_count, 0);
  TestValidator.predicate(
    "link post has domain_name",
    linkSummary.domain_name != null,
  );
  const imageSummary = page.data.find((p) => p.id === imagePost.id);
  TestValidator.equals("image post found", imageSummary != null, true);
  typia.assertGuard(imageSummary!);
  TestValidator.equals("image post title", imageSummary.title, imagePost.title);
  TestValidator.equals("image post type", imageSummary.type, "image");
  TestValidator.equals(
    "image post author id",
    imageSummary.author.id,
    memberId,
  );
  TestValidator.equals(
    "image post community id",
    imageSummary.community.id,
    community.id,
  );
  TestValidator.equals("image post vote score", imageSummary.vote_score, 0);
  TestValidator.equals(
    "image post comment count",
    imageSummary.comment_count,
    0,
  );
  TestValidator.predicate(
    "image post has image_url",
    imageSummary.image_url != null,
  );
}
