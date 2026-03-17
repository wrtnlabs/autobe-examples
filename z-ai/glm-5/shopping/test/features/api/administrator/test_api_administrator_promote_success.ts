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
 * Test the successful promotion of a regular administrator to super administrator grade.
 *
 * Workflow:
 * 1. Create a super administrator who will perform the promotion
 * 2. Create a regular administrator as the target for promotion
 * 3. Super administrator calls promote endpoint with confirmation=true
 * 4. Validate the administrator was successfully promoted to super grade
 */
export async function test_api_administrator_promote_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator who will perform the promotion
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // Step 2: Create a regular administrator who will be the target of promotion
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {},
  );
  typia.assert(regularAdmin);
  // Store original updated_at for comparison
  const originalUpdatedAt = regularAdmin.updated_at;
  // Step 3: Promote the regular administrator to super admin grade
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // Step 4: Validate promotion results
  TestValidator.equals("grade is super", promotedAdmin.grade, "super");
  TestValidator.equals("id matches", promotedAdmin.id, regularAdmin.id);
  TestValidator.predicate(
    "updated_at refreshed",
    promotedAdmin.updated_at !== originalUpdatedAt,
  );
}
