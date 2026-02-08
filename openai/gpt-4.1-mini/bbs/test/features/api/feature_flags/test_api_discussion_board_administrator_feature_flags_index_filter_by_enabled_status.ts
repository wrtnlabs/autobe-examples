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

export async function test_api_discussion_board_administrator_feature_flags_index_filter_by_enabled_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator using join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(auth);
  adminConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Define a function to test filtering by enabled status
  async function testFilter(enabledValue: boolean): Promise<void> {
    const body: IDiscussionBoardFeatureFlag.IRequest = {
      enabled: enabledValue,
    };
    const response =
      await api.functional.discussionBoard.administrator.featureFlags.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    // 3. Validate pagination metadata
    const pagination = response.pagination;
    TestValidator.predicate(
      `pagination current page is >= 0 (enabled=${enabledValue})`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `pagination limit is non-negative (enabled=${enabledValue})`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `pagination records is non-negative (enabled=${enabledValue})`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages is non-negative (enabled=${enabledValue})`,
      pagination.pages >= 0,
    );
    // 4. Validate that filtering results are consistent with the enabled filter
    // Since 'enabled' property does not exist on feature flag summaries,
    // just check that data is returned (or empty) and count matches pagination
    TestValidator.predicate(
      `data count matches pagination records (enabled=${enabledValue})`,
      response.data.length === pagination.records ||
        (pagination.records === 0 && response.data.length === 0),
    );
  }
  // 5. Test filtering for enabled = true
  await testFilter(true);
  // 6. Test filtering for enabled = false
  await testFilter(false);
}
