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

export async function test_api_admin_promotion_unauthorized_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuthorized);
  // Step 2: Create a regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuthorized = await authorize_admin_join(
    regularAdminConnection,
    {},
  );
  typia.assert(regularAdminAuthorized);
  // Step 3: Authenticate as the regular administrator
  const loggedInRegularAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(loggedInRegularAdminConnection, {
    body: {
      email: regularAdminAuthorized.email,
      password: "1234",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/login",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 4: Attempt to call admin promotion endpoint using regular admin's credentials
  // This should fail with 401 Unauthorized or 403 Forbidden
  await TestValidator.error(
    "regular admin cannot promote other admins",
    async () => {
      await api.functional.ecommerceMall.superAdmin.admin_promotions.create(
        loggedInRegularAdminConnection,
        {
          body: {
            adminId: regularAdminAuthorized.id,
            reason: "Attempting unauthorized promotion",
          } satisfies IEcommerceMallAdminPromotion.ICreate,
        },
      );
    },
  );
}
