import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeVote";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_vote_history_pagination_with_multiple_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Test vote history with small limit to create multiple pages
  const limit = 5;
  const firstPage = await api.functional.redditLike.member.votes.index(
    memberConnection,
    {
      body: {
        limit,
      } satisfies IRedditLikeVote.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.predicate(
    "has pagination metadata",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate("has total pages", firstPage.pagination.pages >= 0);
  // 3. If there are votes, test pagination flow
  if (firstPage.data.length > 0) {
    TestValidator.predicate(
      "first page has votes",
      firstPage.data.length <= limit,
    );
    // 4. Navigate through pages using cursor
    let currentPage = firstPage;
    let pageCount = 1;
    const allVoteIds = new Set<string>();
    // Collect all vote IDs from first page
    for (const vote of currentPage.data) {
      TestValidator.predicate("vote has valid id", vote.id !== undefined);
      allVoteIds.add(vote.id);
    }
    // Continue fetching pages while there's a next cursor
    while (currentPage.pagination.current < currentPage.pagination.pages) {
      const nextCursor = typia.random<string>(); // This would normally come from response
      const nextPage = await api.functional.redditLike.member.votes.index(
        memberConnection,
        {
          body: {
            limit,
            cursor: nextCursor,
          } satisfies IRedditLikeVote.IRequest,
        },
      );
      typia.assert(nextPage);
      pageCount++;
      currentPage = nextPage;
      // Validate pagination progression
      TestValidator.equals(
        "page number increments",
        currentPage.pagination.current,
        pageCount,
      );
      TestValidator.equals(
        "page limit consistent",
        currentPage.pagination.limit,
        limit,
      );
      // Collect vote IDs from this page
      for (const vote of currentPage.data) {
        TestValidator.predicate("vote id is unique", !allVoteIds.has(vote.id));
        allVoteIds.add(vote.id);
      }
    }
    // 5. Validate final page
    TestValidator.equals(
      "total pages matches fetched pages",
      currentPage.pagination.pages,
      pageCount,
    );
    TestValidator.predicate(
      "final page has votes within limit",
      currentPage.data.length <= limit,
    );
  } else {
    // 6. Test empty vote history
    TestValidator.equals("empty data array", firstPage.data.length, 0);
    TestValidator.equals("zero records", firstPage.pagination.records, 0);
    TestValidator.equals("zero pages", firstPage.pagination.pages, 0);
  }
  // 7. Test with different limit values
  const differentLimit = 10;
  const anotherPage = await api.functional.redditLike.member.votes.index(
    memberConnection,
    {
      body: {
        limit: differentLimit,
      } satisfies IRedditLikeVote.IRequest,
    },
  );
  typia.assert(anotherPage);
  TestValidator.equals(
    "different limit applied",
    anotherPage.pagination.limit,
    differentLimit,
  );
  TestValidator.predicate(
    "data respects limit",
    anotherPage.data.length <= differentLimit,
  );
  // 8. Test filtering by vote type (upvote)
  const upvoteFilter = await api.functional.redditLike.member.votes.index(
    memberConnection,
    {
      body: {
        limit,
        vote_type: "upvote",
      } satisfies IRedditLikeVote.IRequest,
    },
  );
  typia.assert(upvoteFilter);
  for (const vote of upvoteFilter.data) {
    TestValidator.predicate(
      "all votes are upvotes",
      vote.vote_type === "upvote",
    );
  }
  // 9. Test filtering by content type (post)
  const postFilter = await api.functional.redditLike.member.votes.index(
    memberConnection,
    {
      body: {
        limit,
        content_type: "post",
      } satisfies IRedditLikeVote.IRequest,
    },
  );
  typia.assert(postFilter);
  for (const vote of postFilter.data) {
    TestValidator.predicate(
      "all votes are on posts",
      vote.content_type === "post",
    );
  }
}
