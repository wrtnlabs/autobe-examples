import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_member_community_feed_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 4. Create text post in community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve community feed
  const feed = await api.functional.redditPlatform.member.feeds.community.at(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  typia.assert(feed);
  // 6. Validate response
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.equals("limit", feed.pagination.limit, 20);
  TestValidator.equals("records count", feed.pagination.records, 1);
  TestValidator.equals("pages count", feed.pagination.pages, 1);
  TestValidator.equals("posts count", feed.data.length, 1);
  const createdPost = feed.data[0];
  typia.assert(createdPost);
  TestValidator.equals("post title", createdPost.title, post.title);
  TestValidator.equals("post type", createdPost.post_type, "text");
  TestValidator.equals("upvotes count", createdPost.upvotes_count, 0);
  TestValidator.equals("downvotes count", createdPost.downvotes_count, 0);
  TestValidator.equals("comment count", createdPost.comment_count, 0);
  TestValidator.equals("author id", createdPost.author.id, memberAuth.id);
  TestValidator.equals(
    "author username",
    createdPost.author.username,
    memberAuth.username,
  );
  TestValidator.equals("community id", createdPost.community.id, community.id);
  TestValidator.equals(
    "community name",
    createdPost.community.name,
    community.name,
  );
  TestValidator.predicate(
    "created at valid",
    createdPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at valid",
    createdPost.updated_at !== undefined,
  );
  TestValidator.equals("deleted at null", createdPost.deleted_at, null);
}
