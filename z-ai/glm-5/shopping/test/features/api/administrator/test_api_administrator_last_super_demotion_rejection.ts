import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_last_super_demotion_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first administrator A (becomes super admin as first in system)
  const connectionA: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(connectionA, {});
  typia.assert(adminA);
  // Step 2: Create second administrator B (starts as regular)
  const connectionB: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(connectionB, {});
  typia.assert(adminB);
  // Step 3: Promote B to super administrator (A uses super privileges)
  const promotedB =
    await api.functional.shoppingMall.administrator.administrators.promote(
      connectionA,
      {
        administratorId: adminB.id,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  typia.assert(promotedB);
  TestValidator.equals("B promoted to super", promotedB.grade, "super");
  // Step 4: Demote A to regular administrator (B uses super privileges)
  // This leaves only B as the remaining super administrator
  const demotedA =
    await api.functional.shoppingMall.administrator.administrators.demote(
      connectionB,
      { administratorId: adminA.id },
    );
  typia.assert(demotedA);
  TestValidator.equals("A demoted to regular", demotedA.grade, "regular");
  // Step 5: Attempt to demote B (the last remaining super administrator)
  // Should fail: self-demotion protection AND last-super-admin protection
  await TestValidator.error("last super admin cannot be demoted", async () => {
    await api.functional.shoppingMall.administrator.administrators.demote(
      connectionB,
      { administratorId: adminB.id },
    );
  });
}
