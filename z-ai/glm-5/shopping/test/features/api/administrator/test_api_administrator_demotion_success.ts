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

export async function test_api_administrator_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator A (starts as regular)
  const connectionA: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(connectionA, {});
  typia.assert(adminA);
  TestValidator.equals("admin A initial grade", adminA.grade, "regular");
  // Create second administrator B (starts as regular)
  const connectionB: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(connectionB, {});
  typia.assert(adminB);
  TestValidator.equals("admin B initial grade", adminB.grade, "regular");
  // Promote administrator A to super administrator
  const promotedA =
    await api.functional.shoppingMall.administrator.administrators.promote(
      connectionA,
      {
        administratorId: adminA.id,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  typia.assert(promotedA);
  TestValidator.equals("admin A promoted to super", promotedA.grade, "super");
  // Promote administrator B to super administrator
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
  TestValidator.equals("admin B promoted to super", promotedB.grade, "super");
  // Demote administrator B back to regular
  const demotedB =
    await api.functional.shoppingMall.administrator.administrators.demote(
      connectionA,
      {
        administratorId: adminB.id,
      },
    );
  typia.assert(demotedB);
  // Validate demotion results
  TestValidator.equals("admin B demoted to regular", demotedB.grade, "regular");
  TestValidator.predicate(
    "updated_at refreshed after demotion",
    new Date(demotedB.updated_at).getTime() >
      new Date(promotedB.updated_at).getTime(),
  );
}
