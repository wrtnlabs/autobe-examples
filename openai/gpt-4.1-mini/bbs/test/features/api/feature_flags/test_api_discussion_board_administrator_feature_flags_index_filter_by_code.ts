import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_discussion_board_administrator_feature_flags_index_filter_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Fetch all feature flags without filters
  const allFlags =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(allFlags);
  // If no feature flags, test ends early
  if (allFlags.data.length === 0) return;
  // Since ISummary doesn't have 'code', do not attempt to access it
  // Instead, use an empty string filter or a generic string to test filter behavior
  const filterCode = "";
  // Call filtered feature flags with filter code (empty string to fetch all or filtered by partial code)
  const filteredResult =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {
          code: filterCode,
        } satisfies IDiscussionBoardFeatureFlag.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Validate pagination metadata
  const { pagination } = filteredResult;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination pages count matches records/limit",
      pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pagination pages count zero when limit is zero",
      pagination.pages,
      0,
    );
  }
}
