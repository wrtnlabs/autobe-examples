import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_seller_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

export async function test_api_seller_admin_request_access_denied_to_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A connection
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // 2. Create Seller B connection
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 3. Seller A creates an admin request
  const adminRequest =
    await generate_random_ecommerce_mall_seller_seller_admin_requests_create(
      sellerAConnection,
      {
        body: {
          reason: "Need admin access to manage platform content",
        },
      },
    );
  TestValidator.predicate("admin request created", adminRequest.id !== null);
  // 4. Seller B attempts to access Seller A's admin request
  // Should receive 404 Not Found for security/data isolation
  await TestValidator.httpError(
    "Seller B cannot access Seller A's admin request",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.seller.admin_requests.at(
        sellerBConnection,
        {
          requestId: adminRequest.id,
        },
      ),
  );
}
