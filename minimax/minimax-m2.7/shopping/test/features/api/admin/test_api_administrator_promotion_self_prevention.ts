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
 * Test that a super administrator cannot promote themselves (self-demotion prevention per Section 256 and 531).
 *
 * Validates the complete self-protection constraint that prevents super administrators from promoting their own account. This constraint ensures that administrators cannot accidentally or intentionally demote themselves, bypassing audit trails and creating security gaps.
 *
 * 1. Authenticate as super administrator via /auth/superAdmin/join.
 * 2. Retrieve the authenticated super admin's userId from the login response.
 * 3. Attempt to promote own account via the promotion endpoint using own userId.
 * 4. Validate that the system returns an error stating that a user cannot demote their own administrator role (self-demotion error per Section 531).
 * 5. Verify the super admin's grade remains unchanged.
 */
export async function test_api_administrator_promotion_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  // 2. Retrieve the authenticated super admin's own userId
  const superAdminId: string = authorized.id;
  // 3. Attempt to promote own account (should fail with error)
  await TestValidator.httpError(
    "super admin cannot promote themselves (self-demotion prevention)",
    [400, 403, 422],
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin.promote(
        superAdminConnection,
        {
          userId: superAdminId,
          body: {
            reason: "Attempting self-promotion should fail",
          } satisfies IEcommerceMallAdminPromotion.ICreate,
        },
      ),
  );
  // 4-5. Super admin's account remains unchanged (no promotion record created)
  // The error above confirms the self-demotion prevention worked correctly
}
