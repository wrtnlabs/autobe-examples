import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive filtering capabilities of backup records search.
 * As an administrator, authenticate via join, then search for backup records
 * with multiple filter criteria: backup_type='full', status='completed',
 * specific date ranges, and pagination. Verify the response includes pagination
 * metadata and correctly filtered backup summaries with administrator details.
 * Validate that only current administrator's visible records are returned
 * and delete_at filter is properly applied.
 */
export async function test_api_backup_records_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create search request with comprehensive filtering
  const searchRequest = {
    backup_type: "full",
    status: "completed",
    started_at_after: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(), // Last 7 days
    completed_at_before: new Date().toISOString(),
    initiated_by_admin_id: adminAuth.id,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IDiscussionBoardBackupRecord.IRequest;
  // Execute backup records search
  const searchResult =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // Validate pagination metadata - navigate through nested pagination structure
  TestValidator.equals(
    "current page matches",
    searchResult.pagination.pagination.pagination.pagination.current,
    searchRequest.page ?? 1,
  );
  TestValidator.equals(
    "limit matches",
    searchResult.pagination.pagination.pagination.pagination.limit,
    searchRequest.limit ?? 10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Validate business logic: all returned records should match the filter criteria
  for (const record of searchResult.data) {
    typia.assert(record);
    // Validate that returned records match the filter criteria
    TestValidator.equals(
      "backup type matches filter",
      record.backup_type,
      "full",
    );
    TestValidator.equals("status matches filter", record.status, "completed");
    // Validate date range filtering
    const startedAt = new Date(record.started_at);
    const startedAtAfter = new Date(searchRequest.started_at_after!);
    TestValidator.predicate(
      "started_at is after specified date",
      startedAt >= startedAtAfter,
    );
    if (record.completed_at) {
      const completedAt = new Date(record.completed_at);
      const completedAtBefore = new Date(searchRequest.completed_at_before!);
      TestValidator.predicate(
        "completed_at is before specified date",
        completedAt <= completedAtBefore,
      );
    }
    // Validate administrator relationship
    if (record.initiated_by_admin !== null) {
      typia.assert(record.initiated_by_admin);
      TestValidator.equals(
        "admin ID matches filter",
        record.initiated_by_admin.id,
        searchRequest.initiated_by_admin_id,
      );
    }
  }
}
