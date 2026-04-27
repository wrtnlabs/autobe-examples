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

export async function test_api_administrator_grade_change_log_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Prerequisites: Set up administrators and create grade change events
  //----
  // Step 1: Create admin A (regular administrator)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // Step 2: Promote admin A to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminA.id,
      },
    },
  );
  typia.assert(superAdminA);
  // Step 3: Create admin B (regular administrator — the target)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // Step 4: As super admin A, promote admin B to super admin (creates log #1: regular→super)
  const t1 = new Date();
  const promotedB =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      superAdminConnection,
      { administratorId: adminB.id },
    );
  typia.assert(promotedB);
  // Small delay to ensure distinct timestamps for date-range filtering
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 5: As super admin A, demote admin B back to regular (creates log #2: super→regular)
  const t2 = new Date();
  const demotedB =
    await api.functional.eCommerceMall.superAdministrator.administrators.demote(
      superAdminConnection,
      { administratorId: adminB.id },
    );
  typia.assert(demotedB);
  //----
  // Test A: Filter by promote-only (regular → super)
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.index(
        superAdminConnection,
        {
          administratorId: adminB.id,
          body: {
            previousGrade: "regular",
            newGrade: "super",
          } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("promote filter — data length", result.data.length, 1);
    TestValidator.equals(
      "promote filter — previous grade",
      result.data[0].previousGrade,
      "regular",
    );
    TestValidator.equals(
      "promote filter — new grade",
      result.data[0].newGrade,
      "super",
    );
    TestValidator.predicate(
      "promote filter — has id",
      typeof result.data[0].id === "string",
    );
    TestValidator.predicate(
      "promote filter — has administrator",
      result.data[0].administrator !== undefined,
    );
    TestValidator.predicate(
      "promote filter — has superAdministrator",
      result.data[0].superAdministrator !== undefined,
    );
    TestValidator.predicate(
      "promote filter — has createdAt",
      typeof result.data[0].createdAt === "string",
    );
  }
  //----
  // Test B: Filter by demote-only (super → regular)
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.index(
        superAdminConnection,
        {
          administratorId: adminB.id,
          body: {
            previousGrade: "super",
            newGrade: "regular",
          } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("demote filter — data length", result.data.length, 1);
    TestValidator.equals(
      "demote filter — previous grade",
      result.data[0].previousGrade,
      "super",
    );
    TestValidator.equals(
      "demote filter — new grade",
      result.data[0].newGrade,
      "regular",
    );
  }
  //----
  // Test C: Filter by combination that yields no results (super → super)
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.index(
        superAdminConnection,
        {
          administratorId: adminB.id,
          body: {
            previousGrade: "super",
            newGrade: "super",
          } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      "impossible filter — data length",
      result.data.length,
      0,
    );
    TestValidator.equals(
      "impossible filter — records",
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      "impossible filter — pages",
      result.pagination.pages,
      0,
    );
  }
  //----
  // Test D: Filter by date range covering both events
  //----
  {
    const fromDate = new Date(t1.getTime() - 60000).toISOString();
    const toDate = new Date(t2.getTime() + 60000).toISOString();
    const result =
      await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.index(
        superAdminConnection,
        {
          administratorId: adminB.id,
          body: {
            fromDate: fromDate satisfies string as string &
              tags.Format<"date-time">,
            toDate: toDate satisfies string as string &
              tags.Format<"date-time">,
          } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      "date range both events — data length",
      result.data.length,
      2,
    );
  }
  //----
  // Test E: Filter by date range covering only the promote event
  //----
  {
    const fromDate = new Date(t1.getTime() - 60000).toISOString();
    const toDate = new Date(t1.getTime() + 30000).toISOString();
    const result =
      await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.index(
        superAdminConnection,
        {
          administratorId: adminB.id,
          body: {
            fromDate: fromDate satisfies string as string &
              tags.Format<"date-time">,
            toDate: toDate satisfies string as string &
              tags.Format<"date-time">,
          } satisfies IECommerceMallAdminGradeChangeLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      "date range only promote — data length",
      result.data.length,
      1,
    );
    TestValidator.equals(
      "date range only promote — previous grade",
      result.data[0].previousGrade,
      "regular",
    );
    TestValidator.equals(
      "date range only promote — new grade",
      result.data[0].newGrade,
      "super",
    );
  }
}
