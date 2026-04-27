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

export async function test_api_grade_change_log_regular_admin_own_only(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular admin (admin0) and promote to super admin (acting actor)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const admin0 = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin0);
  // Promote admin0 to super admin
  const superAdminResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin0.id,
      },
    },
  );
  typia.assert(superAdminResult);
  // Step 2: Create first target admin (admin1) - will later query gradeChangeLogs
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin1);
  // Step 3: Promote admin1 (creates grade change: previousGrade='regular', newGrade='super')
  const promoted =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      superAdminConnection,
      { administratorId: admin1.id },
    );
  typia.assert(promoted);
  // Step 4: Demote admin1 (creates grade change: previousGrade='super', newGrade='regular')
  const demoted =
    await api.functional.eCommerceMall.superAdministrator.administrators.demote(
      superAdminConnection,
      { administratorId: admin1.id },
    );
  typia.assert(demoted);
  // Step 5: Create second target admin (admin2)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin2);
  // Step 6: Promote admin2 (creates grade change entries that should NOT be visible to admin1)
  const promoted2 =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      superAdminConnection,
      { administratorId: admin2.id },
    );
  typia.assert(promoted2);
  // Step 7: Demote admin2
  const demoted2 =
    await api.functional.eCommerceMall.superAdministrator.administrators.demote(
      superAdminConnection,
      { administratorId: admin2.id },
    );
  typia.assert(demoted2);
  // Step 8: Query gradeChangeLogs as first admin (no filter)
  const gradeChangeLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      firstAdminConnection,
      {
        body: {} satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(gradeChangeLogs);
  // Step 9: Verify only admin1's two entries are visible
  TestValidator.equals(
    "only admin1's grade changes returned",
    gradeChangeLogs.data.length,
    2,
  );
  TestValidator.equals(
    "total records count is 2",
    gradeChangeLogs.pagination.records,
    2,
  );
  for (const log of gradeChangeLogs.data) {
    TestValidator.equals(
      "log administrator matches admin1",
      log.administrator.id,
      admin1.id,
    );
  }
  // Step 10: Filter by newGrade='super' - should return only the promotion entry
  const promotionLogs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      firstAdminConnection,
      {
        body: {
          newGrade: "super",
        } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(promotionLogs);
  TestValidator.equals(
    "filter by newGrade='super' returns 1 entry",
    promotionLogs.data.length,
    1,
  );
  TestValidator.equals(
    "promotion log has newGrade='super'",
    promotionLogs.data[0].newGrade,
    "super",
  );
  TestValidator.equals(
    "promotion log has previousGrade='regular'",
    promotionLogs.data[0].previousGrade,
    "regular",
  );
  // Step 11: Filter by admin2's id - first admin should see no results
  const admin2Logs =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.index(
      firstAdminConnection,
      {
        body: {
          administratorId: admin2.id,
        } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(admin2Logs);
  TestValidator.equals(
    "first admin cannot see second admin's grade changes",
    admin2Logs.data.length,
    0,
  );
}
