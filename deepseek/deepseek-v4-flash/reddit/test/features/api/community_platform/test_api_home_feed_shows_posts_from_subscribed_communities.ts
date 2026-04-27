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

export async function test_api_home_feed_shows_posts_from_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
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
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the subscribed community
  const bodyText = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 4,
    wordMax: 8,
  });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: bodyText,
      },
    },
  );
  typia.assert(post);
  // 5. Request the Home Feed with sort='new', limit=20
  const homeFeed =
    await api.functional.communityPlatform.member.posts.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "new",
          feed: "home",
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<50>,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(homeFeed);
  // 6. Verify the response contains the created post
  const foundPost = homeFeed.data.find((p) => p.id === post.id);
  TestValidator.predicate(
    "created post is in home feed",
    () => foundPost !== undefined,
  );
  const sp = foundPost!;
  // 7. Verify each post summary includes expected fields
  TestValidator.equals("post type matches", sp.type, "text");
  TestValidator.equals("post title matches", sp.title, post.title);
  TestValidator.equals("post vote_score", sp.vote_score, 0);
  TestValidator.equals("post comment_count", sp.comment_count, 0);
  TestValidator.predicate(
    "post has created_at",
    typeof sp.created_at === "string",
  );
  TestValidator.equals("author id matches", sp.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    sp.author.username,
    member.username,
  );
  TestValidator.equals("community id matches", sp.community.id, community.id);
  TestValidator.equals(
    "community name matches",
    sp.community.name,
    community.name,
  );
  // 8. For text-type posts, verify text_preview contains first 200 characters of body
  const textPost = typia.assert(post.text!);
  TestValidator.equals(
    "text_preview matches first 200 chars of body",
    sp.text_preview,
    textPost.body.substring(0, 200),
  );
  // 9. Verify pagination metadata
  TestValidator.predicate(
    "pagination current is >= 0",
    homeFeed.pagination.current >= 0,
  );
  TestValidator.equals("pagination limit is 20", homeFeed.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is >= 1",
    homeFeed.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is >= 1",
    homeFeed.pagination.pages >= 1,
  );
}
