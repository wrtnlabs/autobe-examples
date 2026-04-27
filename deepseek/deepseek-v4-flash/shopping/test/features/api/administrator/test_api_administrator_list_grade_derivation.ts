import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministrator";
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

/**
 * Test that the administrator listing endpoint correctly derives the 'grade' field for each administrator account, distinguishing between regular administrators and super administrators.
 *
 * This test validates the grade derivation logic that uses a LEFT JOIN with the super_administrators table. Administrators who have a matching super_administrator record receive grade='super', while those without receive grade='regular'.
 *
 * 1. Create AdminA as a regular administrator.
 * 2. Promote AdminA to super administrator, establishing the super admin authentication context.
 * 3. Create AdminB as another regular administrator.
 * 4. Call the PATCH list endpoint with the super admin connection.
 * 5. Verify both administrators appear in the results with correct grade values.
 * 6. Verify pagination metadata is correctly populated.
 */
export async function test_api_administrator_list_grade_derivation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create AdminA (regular administrator)
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
  // 2. Promote AdminA to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminA.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Create AdminB (regular administrator)
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
  // 4. List administrators using super admin connection
  const result: IPageIECommerceMallAdministrator.ISummary =
    await api.functional.eCommerceMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {} satisfies IECommerceMallAdministrator.IRequest,
      },
    );
  typia.assert(result);
  // 5. Verify both administrators are present with correct grades
  const adminASummary: IECommerceMallAdministrator.ISummary | undefined =
    result.data.find((a) => a.id === adminA.id);
  const adminBSummary: IECommerceMallAdministrator.ISummary | undefined =
    result.data.find((a) => a.id === adminB.id);
  TestValidator.predicate(
    "AdminA is in the list",
    () => adminASummary !== undefined,
  );
  TestValidator.predicate(
    "AdminB is in the list",
    () => adminBSummary !== undefined,
  );
  TestValidator.equals(
    "AdminA has grade 'super'",
    adminASummary!.grade,
    "super",
  );
  TestValidator.equals(
    "AdminB has grade 'regular'",
    adminBSummary!.grade,
    "regular",
  );
  // 6. Verify pagination metadata
  TestValidator.predicate(
    "records count is at least 2",
    result.pagination.records >= 2,
  );
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.predicate("pages is at least 1", result.pagination.pages >= 1);
  TestValidator.predicate(
    "limit has a reasonable positive value",
    result.pagination.limit > 0,
  );
}
