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
import { generate_random_ecommerce_mall_super_admin_admin_promotions_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_promotions_create";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

/**
 * Test the successful promotion of a regular administrator to super administrator status.
 *
 * **Test Steps:**
 * 1. Authenticate as super administrator by calling POST /ecommerceMall/auth/superAdmin/join
 * 2. Authenticate as regular administrator by calling POST /ecommerceMall/auth/admin/join
 * 3. Call POST /ecommerceMall/superAdmin/admin-promotions with the regular admin's ID
 * 4. Validate that the response returns proper promotion record
 *
 * **Validation Points:**
 * - Promotion record contains unique promotion ID (UUID format)
 * - The promoted admin's details are included (id, email, name)
 * - The performing super admin's details are included
 * - Action field equals 'promotion'
 * - Optional reason can be provided
 * - Created timestamp is present
 */
export async function test_api_admin_promotion_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create regular administrator account to be promoted
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 3. Perform admin promotion
  const promotion =
    await generate_random_ecommerce_mall_super_admin_admin_promotions_create(
      superAdminConnection,
      {
        body: {
          adminId: admin.id,
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  typia.assert(promotion);
  // 4. Validate promotion record structure
  TestValidator.equals(
    "promotion record has valid ID",
    promotion.id.length > 0,
    true,
  );
  TestValidator.equals(
    "promoted admin id matches",
    promotion.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "promoted admin email matches",
    promotion.admin.email,
    admin.email,
  );
  TestValidator.equals(
    "action type is promotion",
    promotion.action,
    "promotion",
  );
  TestValidator.equals(
    "created timestamp exists",
    promotion.createdAt.length > 0,
    true,
  );
}
