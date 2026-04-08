import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostVote";
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
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
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
import { generate_random_reddit_clone_member_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_votes_pagination_with_many_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates community and subscribes
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  await generate_random_reddit_clone_member_subscriptions_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // 2. Create 5 additional members (B, C, D, E, F) who all subscribe
  const memberConnections: api.IConnection[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {});
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
    memberConnections.push(memberConnection);
  }
  // 3. Member A creates a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Each of the 5 members casts an upvote on the post
  for (const memberConnection of memberConnections) {
    await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { direction: "upvote" },
      },
    );
  }
  // 5. Call GET /redditClone/member/posts/{postId}/votes with limit=3 (first page)
  const firstPageResponse =
    await api.functional.redditClone.member.posts.votes.list(
      memberAConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(firstPageResponse);
  // Validations for first page
  TestValidator.equals(
    "first page should have 3 votes",
    firstPageResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pagination current should be 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records should be 5",
    firstPageResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination pages should be 2",
    firstPageResponse.pagination.pages,
    2,
  );
  // Validate each vote record contains member summary and direction
  for (const vote of firstPageResponse.data) {
    TestValidator.predicate(
      "vote has member summary",
      vote.member !== undefined && vote.member !== null,
    );
    TestValidator.equals(
      "vote direction should be upvote",
      vote.direction,
      "upvote",
    );
    TestValidator.predicate(
      "vote has id",
      vote.id !== undefined && vote.id !== null,
    );
    TestValidator.predicate(
      "vote has created_at",
      vote.created_at !== undefined && vote.created_at !== null,
    );
  }
  // Validate votes are ordered by created_at descending (newest first)
  for (let i = 0; i < firstPageResponse.data.length - 1; i++) {
    const current = new Date(firstPageResponse.data[i].created_at).getTime();
    const next = new Date(firstPageResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `vote ${i} should be newer than vote ${i + 1}`,
      current >= next,
    );
  }
  // Validate post vote score is 5 (all upvotes)
  const postResponse = await api.functional.redditClone.member.posts.votes.list(
    memberAConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(postResponse);
  TestValidator.equals(
    "post should have 5 total votes",
    postResponse.pagination.records,
    5,
  );
}
