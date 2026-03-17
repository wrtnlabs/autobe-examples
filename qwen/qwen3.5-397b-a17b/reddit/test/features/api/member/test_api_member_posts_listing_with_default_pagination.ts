import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_member_posts_listing_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts with different types
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(textPost);
  // Wait a small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "LINK",
        community_id: community.id,
        link: {
          url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    },
  );
  typia.assert(linkPost);
  // Wait a small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "IMAGE",
        community_id: community.id,
        image: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
        },
      },
    },
  );
  typia.assert(imagePost);
  // 5. Call the target endpoint with default pagination (empty body)
  const response = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberId,
      body: {} satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.equals(
    "total records matches posts created",
    response.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages calculation",
    response.pagination.pages,
    Math.ceil(3 / response.pagination.limit),
  );
  // 7. Validate all posts are returned
  TestValidator.equals(
    "data array length matches total",
    response.data.length,
    3,
  );
  // 8. Validate each post has correct author and community
  for (const post of response.data) {
    // Validate author is the member who created posts
    TestValidator.equals("author matches member", post.author.id, memberId);
    // Validate community matches created community
    TestValidator.equals("community matches", post.community.id, community.id);
  }
  // 9. Validate posts are sorted by created_at DESC (newest first)
  const postIds = response.data.map((p) => p.id);
  TestValidator.equals(
    "newest post is first (image)",
    postIds[0],
    imagePost.id,
  );
  TestValidator.equals("middle post is second (link)", postIds[1], linkPost.id);
  TestValidator.equals("oldest post is last (text)", postIds[2], textPost.id);
  // 10. Validate post types are correct
  const postTypes = response.data.map((p) => p.post_type);
  TestValidator.predicate(
    "all post types are valid",
    postTypes.every((t) => ["TEXT", "LINK", "IMAGE"].includes(t)),
  );
}