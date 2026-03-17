import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_feed_empty_page_handling(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const unmatchedRequest = {
    community_slug: `missing-community-${RandomGenerator.alphabets(12)}`,
    author_code: `missing-author-${RandomGenerator.alphabets(12)}`,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPost.IRequest;
  const unmatchedPage = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: unmatchedRequest,
    },
  );
  typia.assert<IPageICommunityPlatformPost.ISummary>(unmatchedPage);
  TestValidator.equals(
    "non-matching request keeps requested page number",
    unmatchedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-matching request keeps requested limit",
    unmatchedPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "non-matching request returns non-negative record count",
    unmatchedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "non-matching request returns non-negative page count",
    unmatchedPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "non-matching filters return empty page data",
    unmatchedPage.data.length,
    0,
  );
  const firstPageRequest = {
    page: 1,
    limit: 1,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;
  const firstPage = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: firstPageRequest,
    },
  );
  typia.assert<IPageICommunityPlatformPost.ISummary>(firstPage);
  const exhaustedPageNumber =
    firstPage.pagination.pages > 0 ? firstPage.pagination.pages + 1 : 2;
  const exhaustedPageRequest = {
    page: exhaustedPageNumber,
    limit: 1,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;
  const exhaustedPage = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: exhaustedPageRequest,
    },
  );
  typia.assert<IPageICommunityPlatformPost.ISummary>(exhaustedPage);
  TestValidator.equals(
    "exhausted page keeps requested page number",
    exhaustedPage.pagination.current,
    exhaustedPageNumber,
  );
  TestValidator.equals(
    "exhausted page keeps requested limit",
    exhaustedPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page beyond remaining records returns empty data",
    exhaustedPage.data.length,
    0,
  );
}
