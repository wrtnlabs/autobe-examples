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

export async function test_api_post_feed_popular_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      body: {},
      params: { communityId: community.id },
    },
  );
  // 4. Create a text-type post
  const textPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 10 }),
      },
    },
  );
  typia.assert(textPost);
  TestValidator.equals("text post type", textPost.type, "text");
  // 5. Create a link-type post
  const linkPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "link",
        url: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post type", linkPost.type, "link");
  // 6. Fetch popular feed (default - no filters)
  const page = await api.functional.communityPlatform.member.posts.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(page);
  // 7. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate("records >= 2", page.pagination.records >= 2);
  TestValidator.predicate("pages >= 1", page.pagination.pages >= 1);
  // 8. Validate both created posts appear in the feed
  const textPostSummary = page.data.find((p) => p.id === textPost.id);
  const linkPostSummary = page.data.find((p) => p.id === linkPost.id);
  TestValidator.predicate(
    "text post appears in feed",
    textPostSummary !== undefined,
  );
  TestValidator.predicate(
    "link post appears in feed",
    linkPostSummary !== undefined,
  );
  // 9. Validate text post summary fields
  if (textPostSummary) {
    typia.assert(textPostSummary);
    TestValidator.equals("text post type", textPostSummary.type, "text");
    TestValidator.equals("text post vote_score", textPostSummary.vote_score, 0);
    TestValidator.equals(
      "text post comment_count",
      textPostSummary.comment_count,
      0,
    );
    TestValidator.equals(
      "text post author id",
      textPostSummary.author.id,
      member.id,
    );
    TestValidator.equals(
      "text post community id",
      textPostSummary.community.id,
      community.id,
    );
    TestValidator.predicate(
      "text post has text_preview",
      typeof textPostSummary.text_preview === "string",
    );
    TestValidator.equals(
      "text post no domain_name",
      textPostSummary.domain_name,
      undefined,
    );
    TestValidator.equals(
      "text post no image_url",
      textPostSummary.image_url,
      undefined,
    );
  }
  // 10. Validate link post summary fields
  if (linkPostSummary) {
    typia.assert(linkPostSummary);
    TestValidator.equals("link post type", linkPostSummary.type, "link");
    TestValidator.equals("link post vote_score", linkPostSummary.vote_score, 0);
    TestValidator.equals(
      "link post comment_count",
      linkPostSummary.comment_count,
      0,
    );
    TestValidator.equals(
      "link post author id",
      linkPostSummary.author.id,
      member.id,
    );
    TestValidator.equals(
      "link post community id",
      linkPostSummary.community.id,
      community.id,
    );
    TestValidator.predicate(
      "link post has domain_name",
      typeof linkPostSummary.domain_name === "string",
    );
    TestValidator.equals(
      "link post no text_preview",
      linkPostSummary.text_preview,
      undefined,
    );
    TestValidator.equals(
      "link post no image_url",
      linkPostSummary.image_url,
      undefined,
    );
  }
}
