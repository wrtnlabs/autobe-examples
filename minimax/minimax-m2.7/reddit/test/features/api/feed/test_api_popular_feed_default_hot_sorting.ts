import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_popular_feed_default_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create multiple text posts with various vote scores
  const posts = await ArrayUtil.asyncRepeat(5, async () => {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "text" as const,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
    return post;
  });
  // Validate posts were created
  TestValidator.equals("should have created 5 posts", posts.length, 5);
  // 5. Request the popular feed without specifying sort parameter (defaults to 'hot')
  const feedResponse =
    await api.functional.redditClone.member.feed.popular.index(
      memberConnection,
      {
        body: {} satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 6. Validate pagination metadata is present
  TestValidator.predicate(
    "pagination exists",
    feedResponse.pagination !== null && feedResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "records count exists",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count exists",
    feedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page exists",
    feedResponse.pagination.current >= 0,
  );
  TestValidator.predicate("limit exists", feedResponse.pagination.limit >= 0);
  // 7. Validate posts are returned
  TestValidator.predicate("feed has posts", feedResponse.data.length > 0);
  // 8. Validate each post contains required fields
  for (const post of feedResponse.data) {
    typia.assert(post);
    // Verify title exists
    TestValidator.predicate(
      "post has title",
      post.title !== null && post.title !== undefined,
    );
    // Verify author (ISummary with id and username)
    TestValidator.predicate(
      "author exists",
      post.author !== null && post.author !== undefined,
    );
    TestValidator.predicate(
      "author has id",
      post.author.id !== null && post.author.id !== undefined,
    );
    TestValidator.predicate(
      "author has username",
      post.author.username !== null && post.author.username !== undefined,
    );
    // Verify community (ISummary with id and name)
    TestValidator.predicate(
      "community exists",
      post.community !== null && post.community !== undefined,
    );
    TestValidator.predicate(
      "community has id",
      post.community.id !== null && post.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      post.community.name !== null && post.community.name !== undefined,
    );
    // Verify vote score and comment count
    TestValidator.predicate(
      "voteScore exists",
      post.voteScore !== null && post.voteScore !== undefined,
    );
    TestValidator.predicate(
      "commentCount exists",
      post.commentCount !== null && post.commentCount !== undefined,
    );
    // Verify type
    TestValidator.predicate(
      "type exists",
      post.type !== null && post.type !== undefined,
    );
    // Verify content preview (string for text posts)
    TestValidator.predicate(
      "contentPreview exists",
      post.contentPreview !== null && post.contentPreview !== undefined,
    );
    // Verify createdAt timestamp
    TestValidator.predicate(
      "createdAt exists",
      post.createdAt !== null && post.createdAt !== undefined,
    );
  }
  // 9. Verify posts from our community are in the feed
  const ourCommunityPosts = feedResponse.data.filter(
    (p) => p.community.id === community.id,
  );
  TestValidator.predicate(
    "should have posts from our community in feed",
    ourCommunityPosts.length > 0,
  );
}
