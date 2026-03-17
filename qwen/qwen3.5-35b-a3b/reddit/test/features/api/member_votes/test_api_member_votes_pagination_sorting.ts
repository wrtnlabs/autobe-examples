import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
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
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_member_votes_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  memberConnection.headers = memberConnection.headers ?? {};
  memberConnection.headers.Authorization = authResult.token.access;
  // 2. Create multiple votes with varying timestamps for sorting tests
  const votes: IRedditCommunityVote[] = [];
  for (let i = 0; i < 15; i++) {
    const vote = await generate_random_reddit_community_member_votes_create(
      memberConnection,
      {
        body: {
          vote_type: i % 2 === 0 ? "upvote" : "downvote",
          target_post_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
    typia.assert(vote);
    votes.push(vote);
  }
  typia.assert(votes);
  // 3. Test pagination - first page with limit
  const firstPage = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        limit: 5,
        page: 1,
        sortBy: "createdAt",
      },
    },
  );
  typia.assert(firstPage);
  // 4. Test pagination metadata validation
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit is 5", firstPage.pagination.limit, 5);
  TestValidator.equals(
    "first page has correct total records",
    firstPage.pagination.records,
    votes.length,
  );
  TestValidator.equals(
    "first page has correct pages count",
    firstPage.pagination.pages,
    Math.ceil(votes.length / 5),
  );
  // 5. Test sorting by createdAt ascending
  const sortedByCreatedAtAsc =
    await api.functional.redditCommunity.member.votes.index(memberConnection, {
      body: {
        commentId: null,
        postId: null,
        limit: 15,
        sortBy: "createdAt",
      },
    });
  typia.assert(sortedByCreatedAtAsc);
  TestValidator.equals(
    "sorted by createdAt returns all votes",
    sortedByCreatedAtAsc.data.length,
    votes.length,
  );
  // 6. Test sorting by voteType
  const sortedByVoteType =
    await api.functional.redditCommunity.member.votes.index(memberConnection, {
      body: {
        commentId: null,
        postId: null,
        limit: 15,
        sortBy: "voteType",
      },
    });
  typia.assert(sortedByVoteType);
  TestValidator.equals(
    "sorted by voteType returns all votes",
    sortedByVoteType.data.length,
    votes.length,
  );
  // 7. Test sorting by directionImpact
  const sortedByDirectionImpact =
    await api.functional.redditCommunity.member.votes.index(memberConnection, {
      body: {
        commentId: null,
        postId: null,
        limit: 15,
        sortBy: "directionImpact",
      },
    });
  typia.assert(sortedByDirectionImpact);
  TestValidator.equals(
    "sorted by directionImpact returns all votes",
    sortedByDirectionImpact.data.length,
    votes.length,
  );
  // 8. Test page beyond total (should return empty data)
  const pageBeyondTotal =
    await api.functional.redditCommunity.member.votes.index(memberConnection, {
      body: {
        commentId: null,
        postId: null,
        limit: 5,
        page: 10,
        sortBy: "createdAt",
      },
    });
  typia.assert(pageBeyondTotal);
  TestValidator.equals(
    "page beyond total has no data",
    pageBeyondTotal.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond total still has correct records total",
    pageBeyondTotal.pagination.records,
    votes.length,
  );
  // 9. Test filtering by voteType
  const upvotesOnly = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        limit: 15,
        voteType: "upvote",
        sortBy: "createdAt",
      },
    },
  );
  typia.assert(upvotesOnly);
  upvotesOnly.data.forEach((vote) => {
    TestValidator.equals(
      "upvote filter returns only upvotes",
      vote.vote_type,
      "upvote",
    );
  });
  // 10. Test filtering by page parameter
  const page2 = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        limit: 5,
        page: 2,
        sortBy: "createdAt",
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
}
