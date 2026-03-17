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

export async function test_api_post_feed_guest_browse_visible_summaries(
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
  const request = {
    sort: "new",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPost.IRequest;
  const firstPage = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: request,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current matches requested page",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty record set returns empty data",
    firstPage.pagination.records !== 0 || firstPage.data.length === 0,
  );
  TestValidator.predicate(
    "visible feed excludes deleted posts",
    firstPage.data.every((post) => post.deleted_at === null),
  );
  const secondPage = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: request,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "stable pagination metadata across identical guest browse requests",
    secondPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "stable ordered item ids across identical guest browse requests",
    secondPage.data.map((post) => post.id),
    firstPage.data.map((post) => post.id),
  );
}
