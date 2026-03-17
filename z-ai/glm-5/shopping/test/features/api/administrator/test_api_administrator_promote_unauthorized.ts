import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that a regular administrator cannot promote other administrators.
 *
 * This test validates the grade-based access control system where only
 * super administrators have the authority to promote regular administrators
 * to super admin grade. A regular administrator attempting this operation
 * should receive HTTP 403 Forbidden.
 */
export async function test_api_administrator_promote_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create first regular administrator (the actor attempting promotion)
  const actorConnection: api.IConnection = { host: connection.host };
  const actor = await authorize_administrator_join(actorConnection, {});
  typia.assert(actor);
  // Create second regular administrator (the target of promotion attempt)
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_administrator_join(targetConnection, {});
  typia.assert(target);
  // Regular administrator attempts to promote another regular administrator
  // This should fail with 403 Forbidden since only super admins can promote
  await TestValidator.httpError(
    "regular administrator cannot promote another administrator",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.promote(
        actorConnection,
        {
          administratorId: target.id,
          body: {
            confirmation: true,
          } satisfies IShoppingMallAdministrator.IPromote,
        },
      );
    },
  );
}
