import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_roles_grade_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin account 1
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Result = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin1Result);
  // 2. Create regular admin account 2
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Result = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2Result);
  // 3. Admin 1 queries all administrators (no filter)
  const allAdmins =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      admin1Connection,
      { body: {} },
    );
  typia.assert(allAdmins);
  // 4. Admin 1 queries regular administrators only
  const regularAdmins =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      admin1Connection,
      { body: { grade: "regular" } },
    );
  typia.assert(regularAdmins);
  // 5. Admin 1 queries super administrators only
  const superAdmins =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      admin1Connection,
      { body: { grade: "super" } },
    );
  typia.assert(superAdmins);
  // 6. Validate that regular admins are subset of all admins
  const allAdminIds = new Set(allAdmins.data.map((a) => a.userId));
  regularAdmins.data.forEach((admin) => {
    TestValidator.equals(
      "regular admin in all admins",
      allAdminIds.has(admin.userId),
      true,
    );
  });
  // 7. Validate that super admins are subset of all admins
  superAdmins.data.forEach((admin) => {
    TestValidator.equals(
      "super admin in all admins",
      allAdminIds.has(admin.userId),
      true,
    );
  });
  // 8. Validate that regular and super admin sets are disjoint
  const regularIdSet = new Set(regularAdmins.data.map((a) => a.userId));
  superAdmins.data.forEach((admin) => {
    TestValidator.equals(
      "super admin not in regular admins",
      regularIdSet.has(admin.userId),
      false,
    );
  });
  // 9. Validate that total count matches expected (regular + super = all)
  TestValidator.equals(
    "all admins count equals regular + super",
    allAdmins.pagination.records,
    regularAdmins.pagination.records + superAdmins.pagination.records,
  );
  // 10. Validate that at least 2 regular admins were created
  TestValidator.predicate(
    "at least 2 regular admins exist",
    () => regularAdmins.pagination.records >= 2,
  );
}