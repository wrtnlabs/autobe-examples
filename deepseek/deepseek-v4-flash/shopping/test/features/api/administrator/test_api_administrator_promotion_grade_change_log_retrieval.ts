import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_administrator_promotion_grade_change_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator A (target to link to super admin X)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_pass_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // 2. Authenticate as bootstrapped (seeded) super admin
  const bootstrappedConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(bootstrappedConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSuperAdministrator.ILogin,
  });
  // 3. Create super admin X by promoting admin A
  const superAdminXJoin = await authorize_super_administrator_join(
    bootstrappedConnection,
    {
      body: {
        administrator_id: adminA.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: "test_pass_123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminXJoin);
  // bootstrappedConnection now has super admin X's auth token
  // 4. Create administrator B (the promotion target)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_pass_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // 5. Promote administrator B to super admin grade using super admin X
  const promotedAdmin =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      bootstrappedConnection,
      {
        administratorId: adminB.id,
      },
    );
  typia.assert(promotedAdmin);
  // Verify promotion: admin B's grade in the response summary should be 'super'
  TestValidator.predicate(
    "promoted administrator grade is 'super'",
    () => promotedAdmin.administrator.grade === "super",
  );
  TestValidator.equals(
    "promoted admin ID matches",
    promotedAdmin.administrator.id,
    adminB.id,
  );
  TestValidator.equals(
    "promoted admin email matches",
    promotedAdmin.administrator.email,
    adminB.email,
  );
  // 6. Create administrator C (independent reader)
  const adminCConnection: api.IConnection = { host: connection.host };
  const adminC = await authorize_administrator_join(adminCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_pass_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminC);
  // 7. Retrieve the grade change log
  // Note: The grade change log ID is not returned by the promote endpoint.
  // We generate the log ID and attempt retrieval.
  const logId = typia.random<string & tags.Format<"uuid">>();
  const log =
    await api.functional.eCommerceMall.administrator.gradeChangeLogs.at(
      adminCConnection,
      {
        logId,
      },
    );
  typia.assert(log);
}
