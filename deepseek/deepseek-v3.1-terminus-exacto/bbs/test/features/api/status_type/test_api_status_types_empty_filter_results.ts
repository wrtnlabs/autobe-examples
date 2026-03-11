import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test edge case where filtering parameters return an empty result set.
 * This scenario validates that the system handles empty results gracefully
 * by returning proper pagination metadata with zero records.
 */
export async function test_api_status_types_empty_filter_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superConnection, {});
  typia.assert(authorized);
  // 2. Prepare filter criteria with intentionally non-matching values
  const filterBody = {
    category: typia.random<string & tags.Format<"uuid">>(),
    code: typia.random<string & tags.Format<"uuid">>(),
    isActive: null,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardStatusType.IRequest;
  // 3. Call status types endpoint with non-matching filters
  const result =
    await api.functional.discussionBoard.superAdmin.status_types.index(
      superConnection,
      { body: filterBody },
    );
  typia.assert(result);
  // 4. Validate empty result set
  TestValidator.equals("data array should be empty", result.data, []);
  TestValidator.equals(
    "total records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pages calculation should be 0 when records is 0",
    result.pagination.pages === 0,
  );
}
