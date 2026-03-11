import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test searching status enumerations using value pattern matching.
 * A super administrator searches for status values containing 'pending' or 'approved'
 * patterns across all entity types. Validate that partial matching works correctly and
 * returns relevant status values. Test pagination by requesting a limited number of
 * results per page and verifying the pagination metadata reflects the total available records.
 */
export async function test_api_status_enum_search_with_value_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Search for status values containing 'pending' pattern
  const pendingSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          value: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(pendingSearch);
  // 3. Validate pagination metadata
  TestValidator.equals("page should be 1", pendingSearch.pagination.current, 1);
  TestValidator.equals(
    "limit should be 10",
    pendingSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records should be non-negative",
    pendingSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    pendingSearch.pagination.pages >= 0,
  );
  // 4. Validate that results contain status values matching 'pending' pattern
  if (pendingSearch.data.length > 0) {
    TestValidator.predicate(
      "at least one status value should contain 'pending'",
      pendingSearch.data.some((status) => status.value.includes("pending")),
    );
  }
  // 5. Search for status values containing 'approved' pattern
  const approvedSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          value: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(approvedSearch);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "page should be 1",
    approvedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    approvedSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records should be non-negative",
    approvedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    approvedSearch.pagination.pages >= 0,
  );
  // 7. Validate that results contain status values matching 'approved' pattern
  if (approvedSearch.data.length > 0) {
    TestValidator.predicate(
      "at least one status value should contain 'approved'",
      approvedSearch.data.some((status) => status.value.includes("approved")),
    );
  }
  // 8. Test partial matching by searching with substring
  const partialSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superAdminConnection,
      {
        body: {
          value: "pend",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(partialSearch);
  // 9. Validate partial matching works
  TestValidator.equals("limit should be 5", partialSearch.pagination.limit, 5);
  if (partialSearch.data.length > 0) {
    TestValidator.predicate(
      "partial matching should find status values containing 'pend'",
      partialSearch.data.some((status) => status.value.includes("pend")),
    );
  }
}
