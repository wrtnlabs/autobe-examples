import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBackupRecord";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_backup_records_minimal_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Perform search with minimal pagination parameters
  const pageResult =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(pageResult);
  // 3. Validate pagination metadata structure
  const { pagination, data } = pageResult;
  // Fix property names based on IPagination interface - use correct nested structure
  const actualPagination = pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "pagination.current should be 1",
    actualPagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 10",
    actualPagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    actualPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    actualPagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.pages ceil calculation",
    actualPagination.pages === 0 ||
      actualPagination.pages ===
        Math.ceil(actualPagination.records / actualPagination.limit),
  );
  TestValidator.predicate(
    "pagination.pages consistent with records",
    actualPagination.pages === 0 ? actualPagination.records === 0 : true,
  );
  // 4. Validate data array length respects pagination limit
  TestValidator.predicate(
    "data length should not exceed limit",
    data.length <= actualPagination.limit,
  );
  // 5. Validate data length matches expected behavior given records count
  if (actualPagination.records > 0) {
    TestValidator.predicate(
      "data should have some records when total > 0",
      data.length > 0,
    );
  }
  // If records is 0, data length should be 0
  if (actualPagination.records === 0) {
    TestValidator.equals(
      "data should be empty when no records",
      data.length,
      0,
    );
  }
  // 6. Verify summary DTOs have required fields (typia.assert already validated types)
  for (const record of data) {
    // Business logic validations only (not type validations)
    // initiated_by_admin can be null - no additional validation needed
    // completed_at can be null - no additional validation needed
    // If completed_at exists and started_at exists, completed_at should not be before started_at
    if (record.completed_at !== null && record.completed_at !== undefined) {
      const started = new Date(record.started_at);
      const completed = new Date(record.completed_at);
      TestValidator.predicate(
        "completed_at should not be before started_at",
        completed >= started,
      );
    }
    // If size_bytes exists, it should be positive
    if (record.size_bytes !== null && record.size_bytes !== undefined) {
      TestValidator.predicate(
        "size_bytes should be positive",
        record.size_bytes > 0,
      );
    }
  }
  // 7. Verify default sorting (descending started_at) - check if multiple records exist
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const prevDate = new Date(data[i - 1].started_at);
      const currDate = new Date(data[i].started_at);
      TestValidator.predicate(
        "records should be sorted by started_at descending",
        prevDate >= currDate,
      );
    }
  }
}
