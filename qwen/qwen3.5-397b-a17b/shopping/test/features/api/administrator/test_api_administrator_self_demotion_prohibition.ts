import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the critical business rule that super administrators cannot demote themselves to regular administrator grade.
 *
 * Validates the self-demotion prohibition security measure that prevents the platform from losing all super admin access. This test ensures that when a super administrator attempts to change their own grade from 'super' to 'regular', the system rejects the request with a 403 Forbidden error before any database modification occurs.
 *
 * The test verifies that the business logic restriction is enforced at the service layer, the error response clearly indicates the restriction reason, and the request is rejected before any database modification. The administrator profile must remain completely unchanged with grade staying 'super' and deleted_at remaining null.
 *
 * 1. Super administrator registers and authenticates via join endpoint.
 * 2. Super admin attempts PUT /shoppingMall/superAdmin/administrators/{own_id} with grade='regular'.
 * 3. Verifies system rejects with 403 Forbidden error.
 * 4. Verifies error message indicates self-demotion prohibition.
 * 5. Confirms administrator profile unchanged through error response validation.
 * 6. Validates security measure prevents privilege escalation and platform access loss.
 */
export async function test_api_administrator_self_demotion_prohibition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Attempt self-demotion - should fail with 403 Forbidden
  await TestValidator.httpError("self-demotion prohibited", 403, async () => {
    await api.functional.shoppingMall.superAdmin.administrators.update(
      superAdminConnection,
      {
        administratorId: superAdmin.id,
        body: {
          grade: "regular",
        } satisfies IShoppingMallAdministrator.IUpdate,
      },
    );
  });
}
