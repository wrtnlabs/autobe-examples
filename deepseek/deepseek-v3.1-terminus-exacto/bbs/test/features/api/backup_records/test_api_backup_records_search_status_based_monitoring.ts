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

export async function test_api_backup_records_search_status_based_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test failed backup records search
  const failedBackups =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          status: "failed",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(failedBackups);
  // Test in_progress backup records search
  const inProgressBackups =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          status: "in_progress",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(inProgressBackups);
  // Validate that status filtering works correctly
  TestValidator.predicate(
    "failed backups should have status 'failed'",
    failedBackups.data.every((record) => record.status === "failed"),
  );
  TestValidator.predicate(
    "in progress backups should have status 'in_progress'",
    inProgressBackups.data.every((record) => record.status === "in_progress"),
  );
  // Validate initiated_by_admin field structure when present
  failedBackups.data.forEach((record) => {
    if (record.initiated_by_admin !== null) {
      TestValidator.predicate(
        "initiated_by_admin should have valid structure",
        typeof record.initiated_by_admin.id === "string" &&
          typeof record.initiated_by_admin.email === "string" &&
          typeof record.initiated_by_admin.display_name === "string" &&
          typeof record.initiated_by_admin.created_at === "string",
      );
    }
  });
  inProgressBackups.data.forEach((record) => {
    if (record.initiated_by_admin !== null) {
      TestValidator.predicate(
        "initiated_by_admin should have valid structure",
        typeof record.initiated_by_admin.id === "string" &&
          typeof record.initiated_by_admin.email === "string" &&
          typeof record.initiated_by_admin.display_name === "string" &&
          typeof record.initiated_by_admin.created_at === "string",
      );
    }
  });
  // Validate that pagination structure exists (without accessing non-existent properties)
  TestValidator.predicate(
    "pagination should have valid structure",
    typeof failedBackups.pagination === "object" &&
      failedBackups.pagination !== null &&
      typeof inProgressBackups.pagination === "object" &&
      inProgressBackups.pagination !== null,
  );
}
