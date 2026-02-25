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

/**
 * Test backup records search with various filter combinations and date range scenarios.
 * As a super administrator analyzing backup trends, create a test super admin account,
 * then execute multiple search scenarios to validate filtering capabilities.
 */
export async function test_api_backup_records_filter_combinations_date_ranges(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
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
  // Scenario 1: Filter by status='in_progress' to see ongoing backups
  const inProgressResult =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          status: "in_progress",
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(inProgressResult);
  // Scenario 2: Filter by backup_type='database_only' with date ranges
  const now = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const databaseOnlyResult =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          backup_type: "database_only",
          started_at_after: oneWeekAgo,
          completed_at_before: now,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(databaseOnlyResult);
  // Scenario 3: Search for backups not initiated by a specific admin (initiated_by_admin_id=null)
  const unassignedResult =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          initiated_by_admin_id: null,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(unassignedResult);
  // Scenario 4: Mixed filters with pagination
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          status: "completed",
          backup_type: "full",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate that pagination result structure is correct
  TestValidator.predicate(
    "pagination result has data array",
    Array.isArray(paginatedResult.data),
  );
  // Edge case: Test with impossible filters to get zero results
  const impossibleResult =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          status: "completed",
          backup_type: "database_only",
          started_at_after: now, // Future date - should return no results
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(impossibleResult);
}
