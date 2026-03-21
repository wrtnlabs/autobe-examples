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

export async function test_api_admin_promotion_forbidden_for_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin account for initial setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create regular admin account for testing authorization
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin" as string & tags.Format<"uri">,
      referrer: "http://localhost:3000" as string & tags.Format<"uri">,
    },
  });
  // 3. Login as regular admin
  await authorize_admin_login(regularAdminConnection, {
    body: {
      email: regularAdmin.email,
      password: "Test1234!" as string & tags.Format<"password">,
      href: "http://localhost:3000/admin" as string & tags.Format<"uri">,
      referrer: "http://localhost:3000" as string & tags.Format<"uri">,
    },
  });
  // 4. Execute GET /ecommerceMall/superAdmin/admin-promotions/{promotionId} with any valid UUID
  // Validate that regular administrator receives HTTP 403 Forbidden
  await TestValidator.httpError(
    "Regular admin cannot access superAdmin-level admin-promotions endpoint",
    403,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin_promotions.at(
        regularAdminConnection,
        {
          promotionId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
