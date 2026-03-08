import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedRequest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_feeds_top_empty_result_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Request TOP feed with default pagination (empty results expected)
  const emptyFeedResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.top.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sortType: "TOP" as const,
      } satisfies IRedditPlatformFeedRequest,
    });
  typia.assert(emptyFeedResponse);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", emptyFeedResponse.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    emptyFeedResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", emptyFeedResponse.pagination.limit, 20);
  TestValidator.equals(
    "records count is 0",
    emptyFeedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0",
    emptyFeedResponse.pagination.pages,
    0,
  );
  // 5. Test with different timeRange values to ensure filter works correctly
  const timeRanges: Array<"TODAY" | "WEEK" | "MONTH" | "YEAR" | "ALL"> = [
    "TODAY",
    "WEEK",
    "MONTH",
    "YEAR",
    "ALL",
  ];
  await ArrayUtil.asyncForEach(timeRanges, async (timeRange) => {
    const timeRangeResponse: IPageIRedditPlatformPost.ISummary =
      await api.functional.redditPlatform.feeds.top.index(memberConnection, {
        body: {
          page: 1,
          limit: 20,
          sortType: "TOP" as const,
          timeRange: timeRange,
        } satisfies IRedditPlatformFeedRequest,
      });
    typia.assert(timeRangeResponse);
    TestValidator.equals(
      `${timeRange} feed has empty data`,
      timeRangeResponse.data.length,
      0,
    );
    TestValidator.equals(
      `${timeRange} feed pagination records is 0`,
      timeRangeResponse.pagination.records,
      0,
    );
  });
  // 6. Verify no errors thrown during empty result scenarios
  TestValidator.predicate(
    "TOP feed handles empty results gracefully",
    () => emptyFeedResponse.data !== null,
  );
}