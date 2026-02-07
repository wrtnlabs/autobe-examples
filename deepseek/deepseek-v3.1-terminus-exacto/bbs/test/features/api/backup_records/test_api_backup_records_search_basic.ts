import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBackupRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the basic search functionality for backup records without any filters applied.
 * This scenario validates that a super administrator can retrieve a paginated list
 * of backup records with default sorting (started_at descending). The test verifies
 * that the response includes proper pagination metadata and that each backup record
 * contains essential information.
 */
export async function test_api_backup_records_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      privilege_level: "super_admin",
    } satisfies DeepPartial<IDiscussionBoardSuperAdmin.IJoin>,
  });
  // Perform basic search with default pagination parameters
  const response =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit within range",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  // Validate data array structure
  TestValidator.predicate(
    "data array length matches pagination",
    response.data.length <= response.pagination.limit,
  );
  // Validate backup records are sorted by started_at descending (default)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].started_at);
      const next = new Date(response.data[i + 1].started_at);
      TestValidator.predicate(
        "records sorted by started_at descending",
        current >= next,
      );
    }
  }
}
