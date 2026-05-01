import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test super administrator demotion of another super administrator to regular grade.
 *
 * Validates the complete demotion workflow where an acting super administrator downgrades another super administrator. The test covers account creation, promotion to super (prerequisite), demotion back to regular, and comprehensive field-level verification of the response.
 *
 * Special attention is given to verifying that only the `grade` and `updated_at` fields change during demotion, while immutable identity fields (`id`, `email`, `created_at`) remain intact.
 *
 * 1. Acting super administrator is created and authenticated via `authorize_admin_join`.
 * 2. Target administrator is created on a separate connection.
 * 3. Target is promoted to super grade by the acting super admin.
 * 4. Target is demoted back to regular grade by the acting super admin.
 * 5. Response is validated: grade is 'regular', updated_at is refreshed, and identity fields are preserved.
 */
export async function test_api_admin_demote_super_to_regular_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the acting super administrator
  const superConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superConnection, {});
  // 2. Create the target administrator (starts as regular)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetConnection, {});
  // 3. Promote the target to super grade (prerequisite for demotion)
  const promotedAdmin = await api.functional.shoppingMall.admin.admins.promote(
    superConnection,
    {
      adminId: targetAdmin.id,
    },
  );
  typia.assert(promotedAdmin);
  TestValidator.equals("promoted grade is super", promotedAdmin.grade, "super");
  TestValidator.equals(
    "promoted id preserved",
    promotedAdmin.id,
    targetAdmin.id,
  );
  // 4. Demote the target super admin back to regular
  const demotedAdmin = await api.functional.shoppingMall.admin.admins.demote(
    superConnection,
    {
      adminId: targetAdmin.id,
    },
  );
  typia.assert(demotedAdmin);
  // 5. Validate the demoted administrator response
  TestValidator.equals(
    "grade demoted to regular",
    demotedAdmin.grade,
    "regular",
  );
  TestValidator.equals("id remains unchanged", demotedAdmin.id, targetAdmin.id);
  TestValidator.equals(
    "email remains unchanged",
    demotedAdmin.email,
    targetAdmin.email,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    demotedAdmin.created_at,
    targetAdmin.created_at,
  );
  TestValidator.notEquals(
    "updated_at is refreshed after demotion",
    demotedAdmin.updated_at,
    promotedAdmin.updated_at,
  );
}
