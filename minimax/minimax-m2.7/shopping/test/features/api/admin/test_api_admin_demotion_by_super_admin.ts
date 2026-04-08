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

export async function test_api_admin_demotion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super admin who will perform the demotion
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_admin_join(superAdminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!",
      href: "/admin/dashboard",
      referrer: "/login",
    },
  });
  typia.assert(superAdminA);
  // 2. Create second super admin who will be the target of demotion
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB = await authorize_super_admin_join(superAdminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!",
      href: "/admin/dashboard",
      referrer: "/login",
    },
  });
  typia.assert(superAdminB);
  // 3. Perform demotion with optional reason
  const demotionReason = "Administrative review completed - reduced privileges";
  const promotion =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.demote(
      superAdminAConnection,
      {
        adminId: superAdminB.id,
        body: {
          reason: demotionReason,
        } satisfies IEcommerceMallAdminPromotion.IDemote,
      },
    );
  typia.assert(promotion);
  // 4. Verify response contains action='demotion'
  TestValidator.equals("action is demotion", promotion.action, "demotion");
  // 5. Verify admin summary has is_super_admin=false
  TestValidator.equals(
    "admin is no longer super admin",
    promotion.admin.is_super_admin,
    false,
  );
  // 6. Verify performedBySuperAdmin contains correct info from SuperAdminA
  TestValidator.equals(
    "performed by super admin A",
    promotion.performedBySuperAdmin.id,
    superAdminA.id,
  );
  TestValidator.equals(
    "performer email matches",
    promotion.performedBySuperAdmin.email,
    superAdminA.email,
  );
  // 7. Verify reason is stored correctly
  TestValidator.equals(
    "reason matches input",
    promotion.reason,
    demotionReason,
  );
}
