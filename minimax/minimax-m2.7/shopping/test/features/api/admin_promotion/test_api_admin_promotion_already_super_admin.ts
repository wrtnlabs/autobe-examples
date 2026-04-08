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

export async function test_api_admin_promotion_already_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator (promoter)
  const promoterConnection: api.IConnection = { host: connection.host };
  const promoter = await authorize_super_admin_join(promoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(promoter);
  // 2. Create second super administrator (target - already super admin)
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_super_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(target);
  // 3. Attempt to promote the second super admin - should fail with 400
  await TestValidator.httpError(
    "cannot promote already super admin",
    400,
    async () =>
      await api.functional.ecommerceMall.superAdmin.superAdmin.admins.promote(
        promoterConnection,
        {
          adminId: target.id,
          body: {},
        },
      ),
  );
}
