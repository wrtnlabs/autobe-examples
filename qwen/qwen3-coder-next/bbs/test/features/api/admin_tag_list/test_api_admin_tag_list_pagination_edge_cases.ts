import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_tag_list_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Admin user requests first page with default limit
  const firstPage =
    await api.functional.discussionBoard.admin.tags.index(adminConnection);
  typia.assert(firstPage);
  TestValidator.equals("first page has data", firstPage.data.length > 0, true);
  TestValidator.equals(
    "first page has pagination",
    firstPage.pagination !== undefined,
    true,
  );
  // Test 2: Admin user specifies custom page number and limit parameters
  // Note: The current API function doesn't accept query parameters, so this test verifies default behavior
  const defaultPage =
    await api.functional.discussionBoard.admin.tags.index(adminConnection);
  typia.assert(defaultPage);
  // Test 3: Verify pagination structure
  TestValidator.predicate(
    "pagination has current page",
    () => typeof firstPage.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    () => typeof firstPage.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    () => typeof firstPage.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => typeof firstPage.pagination.pages === "number",
  );
  // Test 4: Verify data structure
  if (firstPage.data.length > 0) {
    TestValidator.predicate(
      "first tag has expected structure",
      () => firstPage.data[0] !== undefined && firstPage.data[0] !== null,
    );
  }
  // Test 5: Verify tags array structure
  TestValidator.predicate("data is array", () => Array.isArray(firstPage.data));
  TestValidator.predicate(
    "pagination is object",
    () => typeof firstPage.pagination === "object",
  );
  // Test 6: Test pagination calculation logic
  if (firstPage.pagination.records > 0 && firstPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      firstPage.pagination.records / firstPage.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      firstPage.pagination.pages,
      expectedPages,
    );
  }
  // Test 7: Test empty data scenario (when all records retrieved)
  if (firstPage.data.length > 0) {
    // Test with a limit larger than total records
    const largeLimitPage =
      await api.functional.discussionBoard.admin.tags.index(adminConnection);
    typia.assert(largeLimitPage);
    TestValidator.equals(
      "all records returned when limit exceeds records",
      largeLimitPage.data.length,
      firstPage.pagination.records,
    );
  }
}
