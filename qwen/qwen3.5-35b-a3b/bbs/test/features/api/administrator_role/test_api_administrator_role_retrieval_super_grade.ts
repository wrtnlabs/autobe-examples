import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_role_retrieval_super_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication (for promotion)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!",
      displayName: RandomGenerator.name(),
      href: "http://localhost/admin",
      referrer: "http://localhost/",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // 2. Create first regular admin
  const regularAdmin1Connection: api.IConnection = { host: connection.host };
  const regularAdmin1Auth = await authorize_admin_join(
    regularAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Admin12345!",
        displayName: RandomGenerator.name(),
        href: "http://localhost/admin",
        referrer: "http://localhost/",
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    },
  );
  typia.assert(regularAdmin1Auth);
  // 3. Promote regular admin 1 to super (to have a second super admin)
  const promotedAdmin1Connection: api.IConnection = { host: connection.host };
  const promotedAdmin1Role =
    await api.functional.economicPoliticalBoard.admin.roles.promote(
      promotedAdmin1Connection,
      {
        roleId: regularAdmin1Auth.id,
      },
    );
  typia.assert(promotedAdmin1Role);
  // 4. Create second regular admin
  const regularAdmin2Connection: api.IConnection = { host: connection.host };
  const regularAdmin2Auth = await authorize_admin_join(
    regularAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Admin12345!",
        displayName: RandomGenerator.name(),
        href: "http://localhost/admin",
        referrer: "http://localhost/",
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    },
  );
  typia.assert(regularAdmin2Auth);
  // 5. Promote regular admin 2 to super using first super admin
  const superAdminConnection2: api.IConnection = { host: connection.host };
  const promotedAdmin2Role =
    await api.functional.economicPoliticalBoard.admin.roles.promote(
      superAdminConnection2,
      {
        roleId: regularAdmin2Auth.id,
      },
    );
  typia.assert(promotedAdmin2Role);
  // 6. Retrieve the second super admin's role details
  const retrievedRole =
    await api.functional.economicPoliticalBoard.admin.roles.at(
      superAdminConnection2,
      {
        roleId: regularAdmin2Auth.id,
      },
    );
  typia.assert(retrievedRole);
  // 7. Validate the response
  TestValidator.equals(
    "super admin grade is 'super'",
    retrievedRole.grade,
    "super",
  );
  TestValidator.equals(
    "user id matches",
    retrievedRole.user.id,
    regularAdmin2Auth.id,
  );
  TestValidator.equals(
    "promoted by user exists",
    retrievedRole.promotedByUser?.id,
    promotedAdmin1Role.user.id,
  );
  TestValidator.predicate(
    "promoted_at is not null",
    retrievedRole.promoted_at !== null,
  );
  typia.assert(retrievedRole.user);
  typia.assert(retrievedRole.promotedByUser);
}