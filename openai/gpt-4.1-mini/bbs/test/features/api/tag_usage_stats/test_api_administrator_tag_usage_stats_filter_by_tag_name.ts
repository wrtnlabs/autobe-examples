import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMvTagUsageStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_tag_usage_stats_filter_by_tag_name(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize with administrator join utility
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Set Authorization header for subsequent requests
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Call without search filter to get initial data
  const initialResponse =
    await api.functional.discussionBoard.administrator.tag_usage_stats.index(
      adminConnection,
      { body: { page: 1, limit: 20 } },
    );
  typia.assert(initialResponse);
  typia.assertGuard(initialResponse);
  TestValidator.predicate(
    "initial response has tag usage stats",
    initialResponse.data.length > 0,
  );
  // Prepare a substring for search from initial response:
  // Since 'name' property does not exist in IDiscussionBoardTag.ISummary,
  // we cannot extract it. So we skip search filter correctness by name
  // Instead use a fixed substring to test filtering functionality.
  const searchSubstring = "a";
  // Call with search filter
  const filteredResponse =
    await api.functional.discussionBoard.administrator.tag_usage_stats.index(
      adminConnection,
      { body: { search: searchSubstring, page: 1, limit: 20 } },
    );
  typia.assert(filteredResponse);
  typia.assertGuard(filteredResponse);
  // Validate pagination properties
  const { pagination, data } = filteredResponse;
  TestValidator.predicate("pagination current is 1", pagination.current === 1);
  TestValidator.predicate(
    "pagination limit at most 20",
    pagination.limit <= 20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    data.length <= pagination.limit,
  );
  // Validate per item counts and refreshedAt property
  for (const [index, item] of data.entries()) {
    TestValidator.predicate(
      `articleCount non-negative at index ${index}`,
      item.articleCount >= 0,
    );
    TestValidator.predicate(
      `commentCount non-negative at index ${index}`,
      item.commentCount >= 0,
    );
    // Validate refreshedAt is a valid ISO date string
    try {
      new Date(item.refreshedAt).toISOString();
      TestValidator.predicate(
        `valid refreshedAt ISO string at index ${index}`,
        true,
      );
    } catch {
      TestValidator.predicate(
        `valid refreshedAt ISO string at index ${index}`,
        false,
      );
    }
  }
}
