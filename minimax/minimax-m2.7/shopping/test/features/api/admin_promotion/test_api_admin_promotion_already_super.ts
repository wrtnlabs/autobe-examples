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

export async function test_api_admin_promotion_already_super(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // Step 2: Create a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // Step 3 & 4: Authenticate as super admin and promote regular admin to super admin
  const promotingConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(promotingConnection, {
    body: {
      email: superAdmin.email,
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // First promotion should succeed - promote regular admin to super admin
  const firstPromotion =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.create(
      promotingConnection,
      {
        body: {
          adminId: admin.id,
          reason: "Initial promotion to super admin",
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  typia.assert(firstPromotion);
  // Step 5: Attempt to promote the newly created super admin again
  // This should fail with HTTP 400 or 403 error
  await TestValidator.error("cannot promote already-super admin", async () => {
    await api.functional.ecommerceMall.superAdmin.admin_promotions.create(
      promotingConnection,
      {
        body: {
          adminId: admin.id,
          reason: "Duplicate promotion attempt",
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  });
}
