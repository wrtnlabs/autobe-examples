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

export async function test_api_backup_records_search_by_backup_type(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: typia.random<string & typia.tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  typia.assert(auth);
  // Test each backup type
  const backupTypes = [
    "full",
    "incremental",
    "database_only",
    "files_only",
  ] as const;
  for (const backupType of backupTypes) {
    // Search for specific backup type
    const requestBody: IDiscussionBoardBackupRecord.IRequest = {
      backup_type: backupType,
      page: typia.random<
        number & typia.tags.Type<"int32"> & typia.tags.Minimum<1>
      >(),
      limit: typia.random<
        number &
          typia.tags.Type<"int32"> &
          typia.tags.Minimum<1> &
          typia.tags.Maximum<100>
      >(),
    } satisfies IDiscussionBoardBackupRecord.IRequest;
    const response: IPageIDiscussionBoardBackupRecord.ISummary =
      await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
        superAdminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.predicate(
      "pagination object exists",
      response.pagination !== undefined,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
    // Validate pagination metadata
    const { pagination } = response;
    TestValidator.predicate(
      "current page is non-negative",
      pagination.current >= 0,
    );
    TestValidator.predicate(
      "limit is within range",
      pagination.limit >= 1 && pagination.limit <= 100,
    );
    TestValidator.predicate(
      "records count is non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate(
      "total pages is non-negative",
      pagination.pages >= 0,
    );
    // Validate each backup record matches the filtered type
    response.data.forEach((record, index) => {
      TestValidator.equals(
        `record ${index} backup type matches filter`,
        record.backup_type,
        backupType,
      );
      // Validate record structure
      TestValidator.predicate(
        `record ${index} has valid id`,
        typeof record.id === "string" && record.id.length > 0,
      );
      TestValidator.predicate(
        `record ${index} has valid backup_type`,
        typeof record.backup_type === "string" && record.backup_type.length > 0,
      );
      TestValidator.predicate(
        `record ${index} has valid status`,
        typeof record.status === "string" && record.status.length > 0,
      );
      TestValidator.predicate(
        `record ${index} has valid size_bytes`,
        typeof record.size_bytes === "number" && record.size_bytes >= 0,
      );
      TestValidator.predicate(
        `record ${index} has valid started_at`,
        typeof record.started_at === "string" && record.started_at.length > 0,
      );
      // Validate completed_at can be null for in-progress backups
      TestValidator.predicate(
        `record ${index} completed_at is string or null`,
        record.completed_at === null || typeof record.completed_at === "string",
      );
      TestValidator.predicate(
        `record ${index} has valid created_at`,
        typeof record.created_at === "string" && record.created_at.length > 0,
      );
      // Validate initiating administrator structure
      TestValidator.predicate(
        `record ${index} has initiating admin`,
        record.initiatedByAdmin !== undefined,
      );
      const admin = record.initiatedByAdmin;
      TestValidator.predicate(
        `record ${index} admin has valid id`,
        typeof admin.id === "string" && admin.id.length > 0,
      );
      TestValidator.predicate(
        `record ${index} admin has valid email`,
        typeof admin.email === "string" && admin.email.length > 0,
      );
      TestValidator.predicate(
        `record ${index} admin has valid display_name`,
        typeof admin.display_name === "string" && admin.display_name.length > 0,
      );
      TestValidator.predicate(
        `record ${index} admin has valid created_at`,
        typeof admin.created_at === "string" && admin.created_at.length > 0,
      );
    });
    // Validate that all returned records match the filter criteria
    const allMatchType = response.data.every(
      (record) => record.backup_type === backupType,
    );
    TestValidator.predicate(
      `all records match backup type ${backupType}`,
      allMatchType,
    );
  }
}
