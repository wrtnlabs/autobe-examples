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

export async function test_api_discussion_board_administrator_feature_flags_index_no_filter_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IDiscussionBoardAdministrator.IJoin is empty object
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call featureFlags index endpoint without any filter criteria
  const output =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {}, // No filter criteria
      },
    );
  // 3. Assert the response type
  typia.assert(output);
  // 4. Validate pagination metadata presence and validity
  TestValidator.predicate(
    "pagination is present",
    output.pagination !== null && output.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is non-negative integer",
    Number.isInteger(output.pagination.current) &&
      output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    Number.isInteger(output.pagination.limit) && output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    Number.isInteger(output.pagination.records) &&
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    Number.isInteger(output.pagination.pages) && output.pagination.pages >= 0,
  );
  // 5. Validate that data contains array of feature flags
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  // 6. For each feature flag, assert its type and required properties
  for (const featureFlag of output.data) {
    typia.assert(featureFlag);
  }
}
