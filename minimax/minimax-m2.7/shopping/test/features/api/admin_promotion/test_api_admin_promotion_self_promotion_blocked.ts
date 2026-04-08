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
import { generate_random_ecommerce_mall_super_admin_super_admin_admins_promote } from "../../../generate/generate_random_ecommerce_mall_super_admin_super_admin_admins_promote";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

export async function test_api_admin_promotion_self_promotion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Extract the super admin's UUID from registration response
  const superAdminId = authorized.id;
  // 3. Attempt to promote self using the same super admin's ID
  // This should fail with 400 Bad Request - self-promotion not allowed
  await TestValidator.error("self-promotion blocked", async () => {
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.promote(
      superAdminConnection,
      {
        adminId: superAdminId,
        body: {
          reason: "Should not be allowed",
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  });
}
