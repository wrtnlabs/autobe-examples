import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKarmaSnapshot";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaSnapshot";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

/**
 * Test cursor-based pagination for karma snapshots endpoint.
 * 1. Create 5 target members and authenticate them
 * 2. Each member creates a post to have karma to be changed
 * 3. A voter member casts multiple votes on posts from different members
 * 4. Generate karma change snapshots through the votes
 * 5. Test pagination with different page sizes and cursor navigation
 * 6. Verify sort order and relationship data integrity
 */
export async function test_api_karma_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://google.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 2. Create 5 target members who will receive karma changes
  const targetMembers: IRedditCommunityMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const targetConnection: api.IConnection = { host: connection.host };
    const auth = await authorize_member_join(targetConnection, {
      body: {
        email: `target${i}@example.com`,
        password: "1234",
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IRedditCommunityMember.IJoin,
    });
    typia.assert(auth);
    targetMembers.push(auth);
  }
  // 3. Each target member creates a post
  const posts: IRedditCommunityPost[] = [];
  // Use a test community ID (assume test server has this)
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  for (let i = 0; i < 5; i++) {
    const targetConnection: api.IConnection = { host: connection.host };
    targetConnection.headers = {
      ...connection.headers,
      Authorization: targetMembers[i].token.access,
    };
    const post = await api.functional.redditCommunity.member.posts.create(
      targetConnection,
      {
        body: {
          community_id: testCommunityId,
          title: `Test Post ${i + 1}`,
          post_type: "text" as const,
          body: `This is test post content ${i + 1}`,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Voter casts multiple votes on posts from different members
  const votes: IRedditCommunityVote[] = [];
  const voterConnectionWithAuth: api.IConnection = { host: connection.host };
  voterConnectionWithAuth.headers = {
    ...connection.headers,
    Authorization: voterAuth.token.access,
  };
  // Cast upvotes on first 3 posts
  for (let i = 0; i < 3; i++) {
    const vote = await api.functional.redditCommunity.member.votes.create(
      voterConnectionWithAuth,
      {
        body: {
          vote_type: "upvote" as const,
          target_post_id: posts[i].id,
          target_comment_id: undefined,
        } satisfies IRedditCommunityVote.ICreate,
      },
    );
    typia.assert(vote);
    votes.push(vote);
  }
  // Cast downvotes on last 2 posts
  for (let i = 3; i < 5; i++) {
    const vote = await api.functional.redditCommunity.member.votes.create(
      voterConnectionWithAuth,
      {
        body: {
          vote_type: "downvote" as const,
          target_post_id: posts[i].id,
          target_comment_id: undefined,
        } satisfies IRedditCommunityVote.ICreate,
      },
    );
    typia.assert(vote);
    votes.push(vote);
  }
  // 5. Retrieve first page of karma snapshots (default limit)
  const firstPageResponse =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: {} satisfies IRedditCommunityKarmaSnapshot.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit (default)",
    firstPageResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records count",
    firstPageResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination total pages",
    firstPageResponse.pagination.pages,
    1,
  );
  // 6. Verify we have karma snapshots and get cursor from last record
  TestValidator.equals(
    "first page has karma snapshots",
    firstPageResponse.data.length,
    5,
  );
  // Get cursor (created_at) from last record
  const lastRecord = firstPageResponse.data[4];
  typia.assertGuard(lastRecord);
  const cursor = lastRecord.created_at;
  // 7. Test cursor-based pagination - fetch second page (should be empty)
  const secondPageResponse =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: {
          cursor: cursor,
          limit: 100,
          page: 2,
        } satisfies IRedditCommunityKarmaSnapshot.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Verify second page is empty
  TestValidator.equals(
    "second page is empty",
    secondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "second page records count",
    secondPageResponse.pagination.records,
    5,
  );
  // 8. Test with smaller page size - fetch first 3 records with limit=3
  const limitedPageResponse =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: {
          limit: 3,
        } satisfies IRedditCommunityKarmaSnapshot.IRequest,
      },
    );
  typia.assert(limitedPageResponse);
  TestValidator.equals(
    "limited page has 3 records",
    limitedPageResponse.data.length,
    3,
  );
  TestValidator.equals(
    "limited page limit",
    limitedPageResponse.pagination.limit,
    3,
  );
  TestValidator.equals(
    "limited page total records",
    limitedPageResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "limited page total pages (ceil(5/3))",
    limitedPageResponse.pagination.pages,
    2,
  );
  // 9. Get cursor from last record of limited page and fetch second page
  const lastRecordOfLimited = limitedPageResponse.data[2];
  typia.assertGuard(lastRecordOfLimited);
  const cursorOfLimited = lastRecordOfLimited.created_at;
  const limitedSecondPageResponse =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: {
          cursor: cursorOfLimited,
          limit: 3,
          page: 2,
        } satisfies IRedditCommunityKarmaSnapshot.IRequest,
      },
    );
  typia.assert(limitedSecondPageResponse);
  // Verify second page of limited pagination has remaining 2 records
  TestValidator.equals(
    "limited second page has 2 records",
    limitedSecondPageResponse.data.length,
    2,
  );
  TestValidator.equals(
    "limited second page total records",
    limitedSecondPageResponse.pagination.records,
    5,
  );
  // 10. Verify all karma snapshots have complete relationship data
  for (const snapshot of firstPageResponse.data) {
    typia.assertGuard(snapshot);
    typia.assert(snapshot.user);
    typia.assert(snapshot.vote);
    // Validate user relationship
    TestValidator.equals(
      "snapshot user has username",
      snapshot.user.username !== "",
      true,
    );
    typia.assert(snapshot.user.id);
    // Validate vote relationship
    TestValidator.equals(
      "snapshot vote has vote_type",
      snapshot.vote.vote_type === "upvote" ||
        snapshot.vote.vote_type === "downvote",
      true,
    );
    // Validate karma_delta is either +1 or -1
    TestValidator.equals(
      "karma_delta is +1 or -1",
      snapshot.karma_delta === 1 || snapshot.karma_delta === -1,
      true,
    );
    // Validate karma_after_change is an integer
    typia.assert(snapshot.karma_after_change);
    // Validate timestamps are valid ISO 8601
    typia.assert(snapshot.created_at);
    typia.assert(snapshot.updated_at);
  }
  // 11. Test descending sort (default) - verify newest first
  for (let i = 0; i < firstPageResponse.data.length - 1; i++) {
    const current = firstPageResponse.data[i];
    const next = firstPageResponse.data[i + 1];
    typia.assertGuard(current);
    typia.assertGuard(next);
    // Created_at should be in descending order
    TestValidator.predicate(
      "records sorted descending at index " + i,
      new Date(current.created_at) >= new Date(next.created_at),
    );
  }
}
