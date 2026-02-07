import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Test pagination with default parameters
  const defaultResult =
    await api.functional.discussionBoard.admin.logs.index(adminConnection);
  typia.assert(defaultResult);
  // Validate pagination metadata structure exists
  TestValidator.predicate(
    "has pagination object",
    defaultResult.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(defaultResult.data));
  // Validate pagination metadata fields
  TestValidator.predicate(
    "current page is number",
    typeof defaultResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof defaultResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records count is number",
    typeof defaultResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages count is number",
    typeof defaultResult.pagination.pages === "number",
  );
  // Validate pagination constraints
  TestValidator.predicate(
    "current page >= 1",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit >= 0", defaultResult.pagination.limit >= 0);
  TestValidator.predicate(
    "records >= 0",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", defaultResult.pagination.pages >= 0);
  // Validate pages calculation: Math.ceil(records / limit) when records > 0
  if (defaultResult.pagination.records === 0) {
    TestValidator.equals(
      "pages is 0 when no records",
      defaultResult.pagination.pages,
      0,
    );
  } else {
    const expectedPages = Math.ceil(
      defaultResult.pagination.records / defaultResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      defaultResult.pagination.pages,
      expectedPages,
    );
  }
  // Verify data array consistency with pagination metadata
  TestValidator.predicate(
    "data array length <= limit",
    defaultResult.data.length <= defaultResult.pagination.limit,
  );
  TestValidator.predicate(
    "data array length <= records",
    defaultResult.data.length <= defaultResult.pagination.records,
  );
  // Test data content validation
  if (defaultResult.data.length > 0) {
    TestValidator.predicate(
      "has audit log entries",
      defaultResult.data.length > 0,
    );
    TestValidator.predicate(
      "first entry is object",
      typeof defaultResult.data[0] === "object",
    );
  }
}
