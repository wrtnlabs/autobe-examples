import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_feature_flags_pagination_sorted_by_update_time_desc(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Paginated retrieval sorted by updated_at timestamp descending order.
  // Request the second page of feature flags with a small page size.
  // 1. Admin join and create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Parameters for test request
  const pageSize = 3;
  const pageNumber = 2;
  // 2. Request the feature flags for page 1 to collect baseline data
  const firstPageResponse =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
          sort: "updated_at",
        } satisfies IDiscussionBoardFeatureFlag.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // 3. Request the feature flags for page 2
  const secondPageResponse =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {
          page: pageNumber,
          limit: pageSize,
          sort: "updated_at",
        } satisfies IDiscussionBoardFeatureFlag.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // 4. Validate pagination info
  // - current page is correct
  TestValidator.equals(
    "pagination current page",
    secondPageResponse.pagination.current,
    pageNumber,
  );
  // - limit is correct
  TestValidator.equals(
    "pagination limit",
    secondPageResponse.pagination.limit,
    pageSize,
  );
  // - total records is non-negative
  TestValidator.predicate(
    "pagination records non-negative",
    secondPageResponse.pagination.records >= 0,
  );
  // - total pages is consistent with records and limit
  TestValidator.equals(
    "pagination pages correct",
    secondPageResponse.pagination.pages,
    Math.ceil(secondPageResponse.pagination.records / pageSize),
  );
  // 5. Validate data content
  const data = secondPageResponse.data;
  // - data length should be <= limit
  TestValidator.predicate(
    "data length less or equal to limit",
    data.length <= pageSize,
  );
  // - data array should be sorted in descending order of updatedAt
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    TestValidator.predicate(
      `data[${i - 1}].updatedAt >= data[${i}].updatedAt`,
      prev.updatedAt !== undefined && curr.updatedAt !== undefined
        ? prev.updatedAt >= curr.updatedAt
        : true,
    );
  }
  // - all feature flags should have non-empty code and name
  for (const flag of data) {
    TestValidator.predicate("flag code non-empty", flag.code.length > 0);
    TestValidator.predicate("flag name non-empty", flag.name.length > 0);
  }
}
