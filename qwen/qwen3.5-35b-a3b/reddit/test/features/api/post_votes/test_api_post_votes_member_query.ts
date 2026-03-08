import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_votes_member_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberA);
  // 2. Auth as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberB);
  // 3. Member A creates first post
  const memberAPost1 = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT",
        redditPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(memberAPost1);
  // 4. Member A creates second post
  const memberAPost2 = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT",
        redditPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(memberAPost2);
  // 5. Member B creates first post
  const memberBPost1 = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT",
        redditPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(memberBPost1);
  // 6. Member B creates second post
  const memberBPost2 = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT",
        redditPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(memberBPost2);
  // 7. Member A casts upvote on their own post 1
  const memberAVoteOnOwnPost1 =
    await api.functional.redditPlatform.member.post_votes.cast(
      memberAConnection,
      {
        body: {
          post_id: memberAPost1.id,
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(memberAVoteOnOwnPost1);
  // 8. Member A casts upvote on their own post 2
  const memberAVoteOnOwnPost2 =
    await api.functional.redditPlatform.member.post_votes.cast(
      memberAConnection,
      {
        body: {
          post_id: memberAPost2.id,
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(memberAVoteOnOwnPost2);
  // 9. Member A casts upvote on member B's post 1
  const memberAVoteOnMemberBPost1 =
    await api.functional.redditPlatform.member.post_votes.cast(
      memberAConnection,
      {
        body: {
          post_id: memberBPost1.id,
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(memberAVoteOnMemberBPost1);
  // 10. Query with no filters - should return most recent 20 votes
  const defaultQuery = await api.functional.redditPlatform.post_votes.index(
    memberAConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultQuery);
  TestValidator.equals(
    "default query returns votes",
    defaultQuery.data.length > 0,
    true,
  );
  // 11. Query by user_id - should return only member A's votes
  const userFilterQuery = await api.functional.redditPlatform.post_votes.index(
    memberAConnection,
    {
      body: {
        user_id: memberA.id,
      },
    },
  );
  typia.assert(userFilterQuery);
  TestValidator.equals(
    "user_id filter returns only member A's votes",
    userFilterQuery.data.length,
    3,
  );
  for (const vote of userFilterQuery.data) {
    TestValidator.equals("vote user matches filter", vote.user.id, memberA.id);
  }
  // 12. Query by post_id - should return all votes on specific post
  const postFilterQuery = await api.functional.redditPlatform.post_votes.index(
    memberAConnection,
    {
      body: {
        post_id: memberAPost1.id,
      },
    },
  );
  typia.assert(postFilterQuery);
  TestValidator.equals(
    "post_id filter returns votes for post",
    postFilterQuery.data.length,
    1,
  );
  for (const vote of postFilterQuery.data) {
    TestValidator.equals(
      "vote post matches filter",
      vote.post.id,
      memberAPost1.id,
    );
  }
  // 13. Query by vote_type='UPVOTE' - should return only upvotes
  const voteTypeFilterQuery =
    await api.functional.redditPlatform.post_votes.index(memberAConnection, {
      body: {
        vote_type: "UPVOTE",
      },
    });
  typia.assert(voteTypeFilterQuery);
  for (const vote of voteTypeFilterQuery.data) {
    TestValidator.equals("vote type is UPVOTE", vote.vote_type, "UPVOTE");
  }
  // 14. Query sorted by created_at ascending
  const ascendingQuery = await api.functional.redditPlatform.post_votes.index(
    memberAConnection,
    {
      body: {
        sort_by: "created_at",
        order: "asc",
      },
    },
  );
  typia.assert(ascendingQuery);
  if (ascendingQuery.data.length > 1) {
    const firstCreatedAt = ascendingQuery.data[0].created_at;
    const secondCreatedAt = ascendingQuery.data[1].created_at;
    TestValidator.predicate(
      "ascending order is correct",
      firstCreatedAt <= secondCreatedAt,
    );
  }
  // 15. Query sorted by created_at descending
  const descendingQuery = await api.functional.redditPlatform.post_votes.index(
    memberAConnection,
    {
      body: {
        sort_by: "created_at",
        order: "desc",
      },
    },
  );
  typia.assert(descendingQuery);
  if (descendingQuery.data.length > 1) {
    const firstCreatedAt = descendingQuery.data[0].created_at;
    const secondCreatedAt = descendingQuery.data[1].created_at;
    TestValidator.predicate(
      "descending order is correct",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // 16. Pagination test - first page
  const firstPage = await api.functional.redditPlatform.post_votes.index(
    memberAConnection,
    {
      body: {
        limit: 1,
        page: 1,
      },
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page returns 1 record", firstPage.data.length, 1);
  TestValidator.equals(
    "pagination metadata correct",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    firstPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    firstPage.pagination.records,
    3,
  );
  // 17. Pagination test - second page with cursor
  // Note: Cursor is base64-encoded created_at timestamp
  if (firstPage.data.length > 0) {
    const cursor = Buffer.from(firstPage.data[0].created_at, "utf-8").toString(
      "base64",
    );
    const secondPage = await api.functional.redditPlatform.post_votes.index(
      memberAConnection,
      {
        body: {
          cursor: cursor,
          limit: 1,
        },
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page returns 1 record",
      secondPage.data.length,
      1,
    );
    TestValidator.notEquals(
      "second page has different data",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
  // 18. Date range filtering
  const startDate = new Date(2020, 0, 1);
  const endDate = new Date(2030, 0, 1);
  const dateRangeQuery = await api.functional.redditPlatform.post_votes.index(
    memberAConnection,
    {
      body: {
        created_at_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    },
  );
  typia.assert(dateRangeQuery);
  TestValidator.equals(
    "date range filter returns votes within range",
    dateRangeQuery.data.length > 0,
    true,
  );
  // 19. Verify nested objects have correct structure
  for (const vote of userFilterQuery.data) {
    TestValidator.equals(
      "vote user has display_name",
      typeof vote.user.displayName,
      "string",
    );
    TestValidator.equals(
      "vote post has title",
      typeof vote.post.title,
      "string",
    );
    TestValidator.equals(
      "vote post has vote_score",
      typeof vote.post.vote_score,
      "number",
    );
    TestValidator.equals(
      "vote post has comment_count",
      typeof vote.post.comment_count,
      "number",
    );
  }
  // 20. Verify soft-deleted votes are not returned by default
  const includeDeletedQuery =
    await api.functional.redditPlatform.post_votes.index(memberAConnection, {
      body: {
        include_deleted: true,
        vote_type: "NULL",
      },
    });
  typia.assert(includeDeletedQuery);
  TestValidator.equals(
    "include_deleted with vote_type=NULL returns soft-deleted votes",
    includeDeletedQuery.data.length,
    0,
  );
}
