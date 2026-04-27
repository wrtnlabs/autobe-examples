import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminGradeChangeLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_grade_change_log_super_admin_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular administrator (will become super admin)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminJoinResult);
  // Step 2: Promote the admin to super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminJoinResult.id,
      },
    },
  );
  typia.assert(superAdminJoinResult);
  const superAdministratorId = superAdminJoinResult.id;
  // Step 3: Create a target regular administrator
  const targetAdminResult = await authorize_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(targetAdminResult);
  const targetAdministratorId = targetAdminResult.id;
  // Step 4: Promote target admin to super admin (creates grade change log: regular -> super)
  await api.functional.eCommerceMall.superAdministrator.administrators.promote(
    superAdminConnection,
    {
      administratorId: targetAdministratorId,
    },
  );
  // Step 5: Demote target back to regular (creates grade change log: super -> regular)
  await api.functional.eCommerceMall.superAdministrator.administrators.demote(
    superAdminConnection,
    {
      administratorId: targetAdministratorId,
    },
  );
  // Step 6: Query grade change logs with various filters
  // 6.1: No filter - both entries returned sorted by createdAt descending
  const allLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      superAdminConnection,
      {
        body: {} satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(allLogs);
  TestValidator.equals("both logs returned", allLogs.data.length, 2);
  // createdAt descending: demotion (newGrade=regular, created second) first, promotion (newGrade=super, created first) second
  TestValidator.equals(
    "first entry is demotion (newest)",
    allLogs.data[0]!.newGrade,
    "regular",
  );
  TestValidator.equals(
    "second entry is promotion (oldest)",
    allLogs.data[1]!.newGrade,
    "super",
  );
  // 6.2: Filter by newGrade='super' - returns only promotion entry
  const promotionLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      superAdminConnection,
      {
        body: {
          newGrade: "super",
        } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(promotionLogs);
  TestValidator.equals("only promotion log", promotionLogs.data.length, 1);
  TestValidator.equals(
    "promotion newGrade is super",
    promotionLogs.data[0]!.newGrade,
    "super",
  );
  TestValidator.equals(
    "promotion previousGrade is regular",
    promotionLogs.data[0]!.previousGrade,
    "regular",
  );
  // 6.3: Filter by previousGrade='super' - returns only demotion entry
  const demotionLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      superAdminConnection,
      {
        body: {
          previousGrade: "super",
        } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(demotionLogs);
  TestValidator.equals("only demotion log", demotionLogs.data.length, 1);
  TestValidator.equals(
    "demotion previousGrade is super",
    demotionLogs.data[0]!.previousGrade,
    "super",
  );
  TestValidator.equals(
    "demotion newGrade is regular",
    demotionLogs.data[0]!.newGrade,
    "regular",
  );
  // 6.4: Filter by administratorId - returns both entries for target admin
  const adminFilteredLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      superAdminConnection,
      {
        body: {
          administratorId: targetAdministratorId,
        } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(adminFilteredLogs);
  TestValidator.equals(
    "both logs for target admin",
    adminFilteredLogs.data.length,
    2,
  );
  // 6.5: Filter by superAdministratorId - returns both entries
  const superAdminFilteredLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      superAdminConnection,
      {
        body: {
          superAdministratorId: superAdministratorId,
        } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(superAdminFilteredLogs);
  TestValidator.equals(
    "both logs by super admin",
    superAdminFilteredLogs.data.length,
    2,
  );
  // 6.6: Pagination - limit=1 returns one record with correct pagination metadata
  const paginatedLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.equals("one record per page", paginatedLogs.data.length, 1);
  TestValidator.equals(
    "pagination current",
    paginatedLogs.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedLogs.pagination.limit, 1);
  TestValidator.equals(
    "pagination records",
    paginatedLogs.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages", paginatedLogs.pagination.pages, 2);
}
