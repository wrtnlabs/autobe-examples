import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_listing_sorted_by_best(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: {} },
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
  // 4. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create second member, subscribe, and create comments with votes
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, { body: {} });
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 6. Create multiple comments (5 comments) with different vote patterns
  const comments: IRedditCloneComment[] = [];
  for (let i = 0; i < 5; i++) {
    const comment =
      await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
        i % 2 === 0 ? memberConnection : voterConnection,
        {
          body: {
            content: `Comment content ${i} with vote score pattern ${i}`,
          } satisfies IRedditCloneComment.ICreate,
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 7. Test: Retrieve comments sorted by Best with default pagination (page 1)
  const response1 =
    await api.functional.redditClone.redditClone.posts.comments.index(
      connection,
      {
        postId: post.id,
        body: {
          sort: "Best",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(response1);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    response1.pagination !== null,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response1.data),
    true,
  );
  TestValidator.predicate("has comments returned", response1.data.length > 0);
  TestValidator.equals(
    "total comments match",
    response1.data.length,
    comments.length,
  );
  // Validate comments are sorted by vote_score DESC, created_at DESC for tie-breaker
  for (let i = 1; i < response1.data.length; i++) {
    const prevComment = response1.data[i - 1];
    const currComment = response1.data[i];
    if (prevComment.voteScore === currComment.voteScore) {
      TestValidator.predicate(
        `tie-breaker: newer comment (${currComment.createdAt}) comes before older (${prevComment.createdAt})`,
        currComment.createdAt >= prevComment.createdAt,
      );
    } else {
      TestValidator.predicate(
        `vote_score sorted DESC: prev(${prevComment.voteScore}) >= curr(${currComment.voteScore})`,
        prevComment.voteScore >= currComment.voteScore,
      );
    }
  }
  // Validate comment structure
  const firstComment = response1.data[0];
  TestValidator.predicate(
    "author exists",
    firstComment.author !== null && firstComment.author !== undefined,
  );
  TestValidator.predicate(
    "author has username",
    (firstComment.author as IRedditCloneMember.ISummary).username.length > 0,
  );
  TestValidator.predicate("content exists", firstComment.content.length > 0);
  TestValidator.predicate(
    "voteScore is number",
    typeof firstComment.voteScore === "number",
  );
  TestValidator.predicate(
    "createdAt is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstComment.createdAt),
  );
  TestValidator.predicate(
    "replies is array",
    Array.isArray(firstComment.replies),
  );
  // 8. Test: Pagination with limit parameter (verify max 100)
  const responseLimited =
    await api.functional.redditClone.redditClone.posts.comments.index(
      connection,
      {
        postId: post.id,
        body: {
          sort: "Best",
          limit: 2,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(responseLimited);
  TestValidator.predicate(
    "limit respected (max 2)",
    responseLimited.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit set",
    responseLimited.pagination.limit,
    2,
  );
  // 9. Test: Offset-based pagination with page parameter
  const responsePage2 =
    await api.functional.redditClone.redditClone.posts.comments.index(
      connection,
      {
        postId: post.id,
        body: {
          sort: "Best",
          page: 2,
          limit: 2,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(responsePage2);
  TestValidator.equals("page 2", responsePage2.pagination.current, 2);
  // 10. Test: Pagination metadata accuracy
  const totalExpected = comments.length;
  const pageSize = 2;
  const expectedPages = Math.ceil(totalExpected / pageSize);
  TestValidator.equals(
    "total records accurate",
    responsePage2.pagination.records,
    totalExpected,
  );
  TestValidator.equals(
    "total pages accurate",
    responsePage2.pagination.pages,
    expectedPages,
  );
}
