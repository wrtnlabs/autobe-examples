import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_super_administrator_demote_another_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as the pre-seeded bootstrap super administrator
  const seedSuperConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(seedSuperConnection, {
    body: {
      email: "root@wrtn.io",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSuperAdministrator.ILogin,
  });
  // 2. Create admin A (regular administrator)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAJoinResult = await authorize_administrator_join(
    adminAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(adminAJoinResult);
  // 3. Promote admin A to super administrator using seed super admin's authority
  // authorize_super_administrator_join will overwrite seedSuperConnection's
  // Authorization header with admin A's new super admin tokens
  const adminASuperAdminResult = await authorize_super_administrator_join(
    seedSuperConnection,
    {
      body: {
        administrator_id: adminAJoinResult.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies DeepPartial<IECommerceMallSuperAdministrator.IJoin>,
    },
  );
  typia.assert(adminASuperAdminResult);
  // At this point seedSuperConnection has admin A's super admin token
  // 4. Create admin B (regular administrator) using a fresh connection
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBJoinResult = await authorize_administrator_join(
    adminBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(adminBJoinResult);
  // 5. Promote admin B to super administrator using admin A's super admin connection
  const promotedAdminB =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      seedSuperConnection,
      {
        administratorId: adminBJoinResult.id,
      },
    );
  typia.assert(promotedAdminB);
  // 6. Demote admin B back to regular administrator using admin A's super admin connection
  const demotedAdminB =
    await api.functional.eCommerceMall.superAdministrator.administrators.demote(
      seedSuperConnection,
      {
        administratorId: adminBJoinResult.id,
      },
    );
  typia.assert(demotedAdminB);
  // Validate demoted admin B grade is 'regular'
  TestValidator.equals("demoted admin grade", demotedAdminB.grade, "regular");
  // Validate admin A remains a super administrator by checking grade
  TestValidator.predicate(
    "admin A still super administrator",
    () => adminASuperAdminResult.administrator.grade === "super",
  );
}
