import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_promotion_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as superAdmin first
  const superAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: superAdminJoinBody,
  });
  typia.assert(superAdmin);
  // Step 2: Use an obviously non-existent UUID for the requestId
  const nonExistentRequestId = "00000000-0000-0000-0000-000000000000";
  // Step 3: Attempt to retrieve the non-existent admin promotion request
  // Expect a 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent promotion request",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.admin_promotion_requests.at(
        superAdminConnection,
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
}
