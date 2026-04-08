import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_admin_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Test that unauthenticated request to suspend a seller is rejected
  // This test verifies the endpoint requires administrator authentication
  // Create a new connection WITHOUT any authentication headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Attempt to suspend a seller without authentication
  // This should return 401 Unauthorized
  await TestValidator.httpError(
    "suspend seller without authentication returns 401",
    401,
    async () => {
      await api.functional.ecommerceMall.admin.admin.seller_suspensions.create(
        unauthenticatedConnection,
        {
          body: {
            sellerId: typia.random<string & tags.Format<"uuid">>(),
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceMallSellerSuspension.ICreate,
        },
      );
    },
  );
}
