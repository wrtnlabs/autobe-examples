import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportReason";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditcommunityreportreasons_index(
  connection: api.IConnection,
) {
  // 1. Test default request with empty parameters
  const defaultRequest: IRedditCommunityReportReason.IRequest = {};
  const defaultResponse =
    await api.functional.redditCommunity.redditCommunityReportReasons.index(
      connection,
      { body: defaultRequest },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default: pagination current page is non-negative",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default: pagination limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default: data array length not exceeding limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );

  // 2. Test with valid pagination parameters
  const pageOneRequest = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IRedditCommunityReportReason.IRequest;
  const pageOneResponse =
    await api.functional.redditCommunity.redditCommunityReportReasons.index(
      connection,
      { body: pageOneRequest },
    );
  typia.assert(pageOneResponse);
  TestValidator.equals(
    "page 1 current page check",
    pageOneResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit check",
    pageOneResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 data array length not exceeding limit",
    pageOneResponse.data.length <= 10,
  );

  // 3. Test with search filter matching some reason_code or reason_name
  // We pick one reason_code from prior response to search
  if (pageOneResponse.data.length > 0) {
    const firstReasonCode = pageOneResponse.data[0].reason_code;
    const searchRequest = {
      search: firstReasonCode,
    } satisfies IRedditCommunityReportReason.IRequest;
    const searchResponse =
      await api.functional.redditCommunity.redditCommunityReportReasons.index(
        connection,
        { body: searchRequest },
      );
    typia.assert(searchResponse);
    TestValidator.predicate(
      "search: data contains reason_code substring",
      searchResponse.data.every(
        (item) =>
          item.reason_code.includes(firstReasonCode) ||
          item.reason_name.includes(firstReasonCode),
      ),
    );
  }

  // 4. Test invalid page parameter (negative)
  await TestValidator.error(
    "invalid page parameter: negative number",
    async () => {
      await api.functional.redditCommunity.redditCommunityReportReasons.index(
        connection,
        {
          body: { page: -1 } satisfies IRedditCommunityReportReason.IRequest,
        },
      );
    },
  );

  // 5. Test invalid limit parameter (zero)
  await TestValidator.error("invalid limit parameter: zero", async () => {
    await api.functional.redditCommunity.redditCommunityReportReasons.index(
      connection,
      {
        body: { limit: 0 } satisfies IRedditCommunityReportReason.IRequest,
      },
    );
  });
}
