import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_home_feed_subscribed_communities_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member — utility updates connection.headers internally
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (subscribed)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe the member to that community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a text-type post in the subscribed community
  const textPostTitle = `Text Post ${RandomGenerator.alphaNumeric(8)}`;
  const textPostBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const textPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: textPostTitle,
          type: "text",
          body: textPostBody,
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost);
  // 5. Create a link-type post in the subscribed community
  const linkPostTitle = `Link Post ${RandomGenerator.alphaNumeric(8)}`;
  const linkPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: linkPostTitle,
          type: "link",
          url: "https://www.example.com/articles/test-article",
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost);
  // 6. Create a second member with their own community (primary member NOT subscribed)
  //    to verify that unsubscribed community posts do NOT appear in primary member's feed.
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {});
  const otherMemberCommunity =
    await generate_random_community_member_communities_create(
      otherMemberConnection,
      {},
    );
  typia.assert(otherMemberCommunity);
  // Other member subscribes to their own community
  const otherSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      otherMemberConnection,
      { communityId: otherMemberCommunity.id },
    );
  typia.assert(otherSubscription);
  // Other member creates a post in their own community
  const unsubscribedPost =
    await api.functional.community.member.communities.posts.create(
      otherMemberConnection,
      {
        communityId: otherMemberCommunity.id,
        body: {
          title: `Unsubscribed Post ${RandomGenerator.alphaNumeric(8)}`,
          type: "text",
          body: "This post should NOT appear in primary member feed.",
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(unsubscribedPost);
  // 7. Call home feed with empty body (defaults)
  const feed = await api.functional.community.member.feed.index(
    memberConnection,
    { body: {} satisfies ICommunityPost.IRequest },
  );
  typia.assert(feed);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is 1",
    feed.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit >= 1", feed.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records >= 2",
    feed.pagination.records >= 2,
  );
  TestValidator.predicate("pagination pages >= 1", feed.pagination.pages >= 1);
  // 9. Validate data array contains both created posts
  const textPostInFeed = feed.data.find((p) => p.id === textPost.id);
  const linkPostInFeed = feed.data.find((p) => p.id === linkPost.id);
  TestValidator.predicate(
    "text post exists in feed",
    textPostInFeed !== undefined,
  );
  TestValidator.predicate(
    "link post exists in feed",
    linkPostInFeed !== undefined,
  );
  // 10. Validate unsubscribed community post NOT in feed
  const unsubscribedPostInFeed = feed.data.find(
    (p) => p.id === unsubscribedPost.id,
  );
  TestValidator.predicate(
    "unsubscribed community post absent from feed",
    unsubscribedPostInFeed === undefined,
  );
  // 11. Validate each post in feed has required fields
  for (const post of feed.data) {
    TestValidator.predicate("post has non-empty title", post.title.length > 0);
    TestValidator.predicate(
      "post type is valid",
      post.type === "text" || post.type === "link" || post.type === "image",
    );
    TestValidator.predicate("author id present", post.author.id.length > 0);
    TestValidator.predicate(
      "author username present",
      post.author.username.length > 0,
    );
    TestValidator.predicate(
      "community id present",
      post.community.id.length > 0,
    );
    TestValidator.predicate(
      "community name present",
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community subscriberCount >= 1",
      post.community.subscriberCount >= 1,
    );
    TestValidator.predicate("comment_count >= 0", post.comment_count >= 0);
    TestValidator.predicate("created_at present", post.created_at.length > 0);
  }
  // 12. Validate text post specific fields
  if (textPostInFeed !== undefined) {
    TestValidator.equals(
      "text post title matches",
      textPostInFeed.title,
      textPostTitle,
    );
    TestValidator.equals("text post type", textPostInFeed.type, "text");
    TestValidator.equals(
      "text post community name",
      textPostInFeed.community.name,
      community.name,
    );
    TestValidator.equals(
      "text post author username",
      textPostInFeed.author.username,
      member.username,
    );
    TestValidator.predicate(
      "text post vote_score is integer",
      Number.isInteger(textPostInFeed.vote_score),
    );
    TestValidator.predicate(
      "text preview type is text",
      textPostInFeed.preview.type === "text",
    );
    if (textPostInFeed.preview.type === "text") {
      TestValidator.predicate(
        "text preview snippet <= 200 chars",
        textPostInFeed.preview.snippet.length <= 200,
      );
    }
  }
  // 13. Validate link post specific fields
  if (linkPostInFeed !== undefined) {
    TestValidator.equals(
      "link post title matches",
      linkPostInFeed.title,
      linkPostTitle,
    );
    TestValidator.equals("link post type", linkPostInFeed.type, "link");
    TestValidator.equals(
      "link post community name",
      linkPostInFeed.community.name,
      community.name,
    );
    TestValidator.equals(
      "link post author username",
      linkPostInFeed.author.username,
      member.username,
    );
    TestValidator.predicate(
      "link post vote_score is integer",
      Number.isInteger(linkPostInFeed.vote_score),
    );
    TestValidator.predicate(
      "link preview type is link",
      linkPostInFeed.preview.type === "link",
    );
    if (linkPostInFeed.preview.type === "link") {
      TestValidator.predicate(
        "link preview domain non-empty",
        linkPostInFeed.preview.domain.length > 0,
      );
    }
  }
}
