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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_analytics_posts_top_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Test pagination with large dataset
  const request: IRedditCloneContentPost.IRequest = {
    sort: "top",
    page: 1,
    limit: 10,
    timeFilter: "allTime",
  };
  // 3. Get first page
  const firstPage: IPageIRedditCloneContentPost.ISummary =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      { body: request },
    );
  typia.assert(firstPage);
  // 4. Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page has records",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page has pages",
    firstPage.pagination.pages >= 1,
  );
  // 5. Validate posts array structure
  TestValidator.predicate("first page has posts", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page posts count matches limit",
    firstPage.data.length <= request.limit,
  );
  // 6. Validate post summary fields
  for (const post of firstPage.data) {
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals("post has author id", typeof post.author.id, "string");
    TestValidator.equals(
      "post has author username",
      typeof post.author.username,
      "string",
    );
    TestValidator.equals(
      "post has community id",
      typeof post.community.id,
      "string",
    );
    TestValidator.equals(
      "post has community name",
      typeof post.community.name,
      "string",
    );
    TestValidator.equals("post has voteScore", typeof post.voteScore, "number");
    TestValidator.equals(
      "post has commentCount",
      typeof post.commentCount,
      "number",
    );
    TestValidator.equals("post has viewCount", typeof post.viewCount, "number");
    TestValidator.equals(
      "post has upvoteCount",
      typeof post.upvoteCount,
      "number",
    );
    TestValidator.equals(
      "post has downvoteCount",
      typeof post.downvoteCount,
      "number",
    );
    TestValidator.equals("post has timeAgo", typeof post.timeAgo, "string");
    TestValidator.equals(
      "post has trendingScore",
      typeof post.trendingScore,
      "number",
    );
    TestValidator.equals(
      "post has engagementRate",
      typeof post.engagementRate,
      "number",
    );
    TestValidator.equals(
      "post has created_at",
      typeof post.created_at,
      "string",
    );
  }
  // 7. Test subsequent pages
  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageIRedditCloneContentPost.ISummary =
      await api.functional.redditClone.member.analytics.posts.top.index(
        memberConnection,
        {
          body: {
            ...request,
            page: 2,
          },
        },
      );
    typia.assert(secondPage);
    // Validate second page metadata
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
    // Verify total records consistent across pages
    TestValidator.equals(
      "total records consistent",
      firstPage.pagination.records,
      secondPage.pagination.records,
    );
  }
  // 8. Test limit boundary
  const largeLimitRequest: IRedditCloneContentPost.IRequest = {
    sort: "top",
    page: 1,
    limit: 50,
    timeFilter: "allTime",
  };
  const largeLimitPage: IPageIRedditCloneContentPost.ISummary =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      { body: largeLimitRequest },
    );
  typia.assert(largeLimitPage);
  TestValidator.equals(
    "large limit page limit",
    largeLimitPage.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large limit page posts count",
    largeLimitPage.data.length <= 50,
  );
  // 9. Test maximum limit (100)
  const maxLimitRequest: IRedditCloneContentPost.IRequest = {
    sort: "top",
    page: 1,
    limit: 100,
    timeFilter: "allTime",
  };
  const maxLimitPage: IPageIRedditCloneContentPost.ISummary =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      { body: maxLimitRequest },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page posts count",
    maxLimitPage.data.length <= 100,
  );
}
