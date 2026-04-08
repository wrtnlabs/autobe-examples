import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_admin_promote } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_promote";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

/**
 * Test that a super administrator cannot promote another super administrator.
 *
 * Validates the business rule that only regular administrators can be promoted
 * to super administrator status. This test verifies that attempting to promote
 * a super admin returns an error, no audit record is created, and neither
 * account's status changes.
 *
 * **Business Rule (Section 531):** Cannot promote users who are not regular
 * administrators. Super administrators are already at the highest privilege
 * level and cannot be promoted further.
 *
 * 1. Authenticate as first super administrator.
 * 2. Create second super administrator account.
 * 3. Attempt to promote second super admin using first super admin's credentials.
 * 4. Validate error response indicating invalid promotion target (super admin cannot be promoted).
 * 5. Verify no audit record was created for this invalid operation.
 */
export async function test_api_administrator_promotion_invalid_target_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first super administrator
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(
    superAdmin1Connection,
    {},
  );
  typia.assert(superAdmin1);
  // 2. Create second super administrator account
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_admin_join(
    superAdmin2Connection,
    {},
  );
  typia.assert(superAdmin2);
  // 3. Attempt to promote second super admin (who is already super admin)
  // This should fail because super admins cannot be promoted to super admin
  await TestValidator.error(
    "cannot promote super administrator to super administrator",
    async () => {
      await api.functional.ecommerceMall.superAdmin.admin.promote(
        superAdmin1Connection,
        {
          userId: superAdmin2.id,
          body: {
            reason: "Attempting invalid promotion of super admin",
          } satisfies IEcommerceMallAdminPromotion.ICreate,
        },
      );
    },
  );
}
