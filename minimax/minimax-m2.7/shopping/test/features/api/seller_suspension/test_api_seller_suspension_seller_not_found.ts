import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_seller_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>() as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Attempt to suspend a non-existent seller (should fail with 404)
  await TestValidator.httpError("seller not found (404)", 404, async () => {
    const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
    await api.functional.ecommerceMall.admin.seller_suspensions.create(
      adminConnection,
      {
        body: {
          seller_id: nonExistentSellerId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  });
}
