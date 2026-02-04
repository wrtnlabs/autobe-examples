import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_popular_feed_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new connection and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // memberConnection.headers is now updated internally by authorize function
  // Step 2: Fetch the first page of popular feed data (max 20 posts)
  const firstPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.hot.index(
      memberConnection,
    );
  typia.assert(firstPage);
  // Step 3: Validate first page has exactly 20 posts
  TestValidator.equals(
    "first page has 20 posts",
    firstPage.pagination.limit,
    20,
  );
  TestValidator.equals("first page has 20 records", firstPage.data.length, 20);
  // Step 4: Extract the last post ID from the first page for pagination check
  const lastPostIdOnFirstPage = firstPage.data[firstPage.data.length - 1].id;
  // Step 5: Fetch the second page of popular feed data
  const secondPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.hot.index(
      memberConnection,
    );
  typia.assert(secondPage);
  // Step 6: Validate pagination metadata structure and values
  TestValidator.equals(
    "second page has 20 posts limit",
    secondPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "second page has exactly 20 records",
    secondPage.data.length,
    20,
  );
  TestValidator.equals(
    "second page is page 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.predicate(
    "total records is sufficient for multiple pages",
    () => secondPage.pagination.records > 40,
  );
  TestValidator.predicate(
    "total pages is at least 2",
    () => secondPage.pagination.pages >= 2,
  );
  // Step 7: Validate that data between pages is different (no overlap)
  const secondPageFirstPostId = secondPage.data[0].id;
  TestValidator.notEquals(
    "first post on second page is different from last post on first page",
    secondPageFirstPostId,
    lastPostIdOnFirstPage,
  );
  // Step 8: Validate pagination fields integrity
  TestValidator.predicate(
    "records >= current * limit",
    () =>
      secondPage.pagination.records >=
      secondPage.pagination.current * secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "pages >= current",
    () => secondPage.pagination.pages >= secondPage.pagination.current,
  );
  TestValidator.predicate("pages > 1", () => secondPage.pagination.pages > 1);
}
