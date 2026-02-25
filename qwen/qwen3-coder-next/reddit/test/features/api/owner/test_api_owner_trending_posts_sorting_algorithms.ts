import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_trending_posts_sorting_algorithms(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection for authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Prepare trending request with each sorting algorithm
  const sortAlgorithms: ("hot" | "new" | "top" | "controversial")[] = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  const timeFilters: Array<"today" | "week" | "month" | "year" | "allTime"> = [
    "today",
    "week",
    "month",
    "year",
    "allTime",
  ];
  // 3. Test each sorting algorithm
  for (const sort of sortAlgorithms) {
    // 3.1. Prepare trending request
    const trendingRequest: IRedditCloneContentPost.IRequest = {
      sort: sort,
      page: 1,
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      timeFilter:
        sort === "top" ? RandomGenerator.pick(timeFilters) : undefined,
    };
    // 3.2. Call trending endpoint
    const trendingResponse =
      await api.functional.redditClone.owner.analytics.posts.trending(
        ownerConnection,
        {
          body: trendingRequest,
        },
      );
    // 3.3. Validate response structure
    typia.assert(trendingResponse);
    // 3.4. Validate pagination
    TestValidator.equals(
      "page number matches",
      trendingResponse.pagination.current,
      1,
    );
    TestValidator.predicate(
      "limit valid",
      trendingResponse.pagination.limit >= 1 &&
        trendingResponse.pagination.limit <= 100,
    );
    TestValidator.predicate(
      "records non-negative",
      trendingResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages non-negative",
      trendingResponse.pagination.pages >= 0,
    );
    // 3.5. Validate posts array
    TestValidator.predicate("has posts", trendingResponse.data.length > 0);
    // 3.6. Validate post structure
    for (const post of trendingResponse.data) {
      TestValidator.predicate("has valid id", /^[0-9a-f-]{36}$/i.test(post.id));
      TestValidator.predicate(
        "has title",
        typeof post.title === "string" && post.title.length > 0,
      );
      TestValidator.predicate(
        "has author",
        post.author !== null && post.author !== undefined,
      );
      TestValidator.predicate(
        "has community",
        post.community !== null && post.community !== undefined,
      );
      TestValidator.predicate(
        "voteScore is integer",
        Number.isInteger(post.voteScore),
      );
      TestValidator.predicate(
        "commentCount is integer",
        Number.isInteger(post.commentCount),
      );
      TestValidator.predicate(
        "viewCount is integer",
        Number.isInteger(post.viewCount),
      );
      TestValidator.predicate(
        "upvoteCount is integer",
        Number.isInteger(post.upvoteCount),
      );
      TestValidator.predicate(
        "downvoteCount is integer",
        Number.isInteger(post.downvoteCount),
      );
      TestValidator.predicate(
        "timeAgo is string",
        typeof post.timeAgo === "string",
      );
      TestValidator.predicate(
        "trendingScore is number",
        typeof post.trendingScore === "number",
      );
      TestValidator.predicate(
        "engagementRate is number",
        typeof post.engagementRate === "number",
      );
      TestValidator.predicate(
        "has valid created_at",
        typeof post.created_at === "string" &&
          !isNaN(Date.parse(post.created_at)),
      );
    }
    // 3.7. Validate sort-specific behaviors
    if (sort === "hot") {
      TestValidator.predicate(
        "hot posts have trending scores",
        trendingResponse.data.every((post) => post.trendingScore >= 0),
      );
    } else if (sort === "new") {
      // New posts should be sorted by creation date (descending)
      if (trendingResponse.data.length > 1) {
        for (let i = 1; i < trendingResponse.data.length; i++) {
          TestValidator.predicate(
            `post ${i} is newer than or equal to post ${i + 1}`,
            new Date(trendingResponse.data[i - 1].created_at).getTime() >=
              new Date(trendingResponse.data[i].created_at).getTime(),
          );
        }
      }
    } else if (sort === "top") {
      // Top posts should be sorted by vote score (descending)
      if (trendingResponse.data.length > 1) {
        for (let i = 1; i < trendingResponse.data.length; i++) {
          TestValidator.predicate(
            `post ${i} has vote score >= post ${i + 1}`,
            trendingResponse.data[i - 1].voteScore >=
              trendingResponse.data[i].voteScore,
          );
        }
      }
    } else if (sort === "controversial") {
      TestValidator.predicate(
        "controversial posts have high engagement",
        trendingResponse.data.every(
          (post) => post.upvoteCount > 0 || post.downvoteCount > 0,
        ),
      );
    }
  }
  // 4. Test pagination functionality
  const paginationTestRequest: IRedditCloneContentPost.IRequest = {
    sort: "hot",
    page: 1,
    limit: 10,
  };
  const firstPage =
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      { body: paginationTestRequest },
    );
  const secondPageRequest: IRedditCloneContentPost.IRequest = {
    ...paginationTestRequest,
    page: 2,
  };
  const secondPage =
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      { body: secondPageRequest },
    );
  // 4.1. Validate pagination results
  TestValidator.equals("page 1 has 10 posts", firstPage.data.length, 10);
  TestValidator.equals("page 2 has 10 posts", secondPage.data.length, 10);
  // 4.2. Validate different page data
  const firstPageIds = firstPage.data.map((post) => post.id);
  const secondPageIds = secondPage.data.map((post) => post.id);
  TestValidator.notEquals(
    "page 1 and 2 have different posts",
    JSON.stringify(firstPageIds.sort()),
    JSON.stringify(secondPageIds.sort()),
  );
}
