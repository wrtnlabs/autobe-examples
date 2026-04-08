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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_admin_promote } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_promote";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

/**
 * Test the successful promotion of a regular administrator to super administrator status.
 *
 * Validates that a super administrator can elevate a regular administrator's privileges.
 * This test ensures the complete promotion workflow including authentication, promotion request,
 * and response validation with audit trail creation.
 *
 * 1. Super administrator registers via /auth/superAdmin/join.
 * 2. Regular administrator registers via /auth/admin/join.
 * 3. Super administrator calls the promotion endpoint with the regular admin's userId.
 * 4. Validates the response returns a promotion record with action='promotion'.
 * 5. Verifies the response includes promoted admin details and performing super admin details.
 * 6. Verifies the promotion record has a valid creation timestamp.
 * 7. Validates the complete audit record structure matches IEcommerceMallAdminPromotion schema.
 */
export async function test_api_administrator_promotion_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create a regular administrator account to be promoted
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 3. Call the promotion endpoint - super admin promotes regular admin to super admin
  const promotion = await api.functional.ecommerceMall.superAdmin.admin.promote(
    superAdminConnection,
    {
      userId: admin.id,
      body: {
        reason: "Performance review completed successfully",
      } satisfies IEcommerceMallAdminPromotion.ICreate,
    },
  );
  typia.assert(promotion);
  // 4. Validate the promotion record structure
  TestValidator.equals(
    "action should be 'promotion'",
    promotion.action,
    "promotion",
  );
  // 5. Verify promoted admin details are included
  TestValidator.equals("admin id should match", promotion.admin.id, admin.id);
  TestValidator.equals(
    "admin email should match",
    promotion.admin.email,
    admin.email,
  );
  // 6. Verify performing super admin details are included
  TestValidator.equals(
    "performed by super admin id should match",
    promotion.performedBySuperAdmin.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "performed by super admin email should match",
    promotion.performedBySuperAdmin.email,
    superAdmin.email,
  );
  // 7. Verify reason is included
  TestValidator.equals(
    "reason should match",
    promotion.reason,
    "Performance review completed successfully",
  );
  // 8. Verify timestamp exists and is valid
  TestValidator.predicate(
    "created_at should exist and be valid ISO datetime",
    () => {
      const date = new Date(promotion.created_at);
      return !isNaN(date.getTime());
    },
  );
}
