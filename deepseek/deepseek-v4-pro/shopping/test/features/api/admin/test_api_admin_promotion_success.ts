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
 * Test that a super administrator can successfully promote a regular administrator.
 *
 * Validates the complete administrator promotion workflow from a super administrator promoting a regular administrator to the super grade. Verifies grade transformation, timestamp updates, and identity field preservation after the promotion.
 *
 * Note: Audit log entry verification and super-admin-only operation access verification (e.g., viewing pending administrator requests) are not included in this test as those endpoints are not available in the current SDK.
 *
 * 1. Super administrator registers and authenticates on the platform.
 * 2. Regular administrator registers as the promotion target.
 * 3. Super administrator calls the promote endpoint with the regular admin's ID.
 * 4. Validates the promoted admin's grade is "super".
 * 5. Validates identity fields (id, email, created_at) remain unchanged.
 * 6. Validates updated_at timestamp is strictly more recent than pre-promotion.
 */
export async function test_api_admin_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create regular administrator as promotion target
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {});
  typia.assert(regularAdmin);
  // 3. Super admin promotes the regular admin
  const promoted = await api.functional.shoppingMall.admin.admins.promote(
    superAdminConnection,
    { adminId: regularAdmin.id },
  );
  typia.assert(promoted);
  // 4. Validate grade changed to "super"
  TestValidator.equals("grade should be super", promoted.grade, "super");
  // 5. Validate identity fields preserved
  TestValidator.equals("id should be preserved", promoted.id, regularAdmin.id);
  TestValidator.equals(
    "email should be preserved",
    promoted.email,
    regularAdmin.email,
  );
  TestValidator.equals(
    "created_at should be unchanged",
    promoted.created_at,
    regularAdmin.created_at,
  );
  // 6. Validate updated_at is more recent after promotion
  TestValidator.predicate(
    "updated_at should be more recent",
    promoted.updated_at > regularAdmin.updated_at,
  );
}
