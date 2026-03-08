import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_creation_link_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "password123",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 2. Subscribe to the community
  const communityNameForTest = "general";
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: communityNameForTest,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription status is subscribed",
    subscription.status,
    "subscribed",
  );
  // 3. Create a link post
  const linkPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "link",
        url: `https://example.com/${RandomGenerator.alphaNumeric(10)}` satisfies
          | (string & tags.Format<"uri">)
          | null,
        community_id: subscription.community.id,
      },
    },
  );
  typia.assert(linkPost);
  // 4. Validate link post properties
  TestValidator.equals("post type is link", linkPost.type, "link");
  TestValidator.predicate(
    "url is valid URI",
    typeof linkPost.url === "string" && linkPost.url.startsWith("https://"),
  );
  TestValidator.equals("content is null for link post", linkPost.content, null);
  TestValidator.equals(
    "image_url is null for link post",
    linkPost.image_url,
    null,
  );
  TestValidator.equals("initial score is 0", linkPost.score, 0);
  TestValidator.equals("initial comment_count is 0", linkPost.comment_count, 0);
  TestValidator.equals("author matches member", linkPost.author.id, member.id);
  TestValidator.equals(
    "community matches subscribed community",
    linkPost.community.id,
    subscription.community.id,
  );
}
