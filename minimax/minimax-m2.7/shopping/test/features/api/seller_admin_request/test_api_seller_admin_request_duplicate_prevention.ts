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

export async function test_api_seller_admin_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {});
  // 2. Submit first admin request - should succeed
  const firstRequest =
    await api.functional.ecommerceMall.seller.seller.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason:
            "I want to help manage the platform and ensure quality standards",
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 3. Submit second admin request - should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "duplicate pending admin request should fail",
    409,
    async () => {
      await api.functional.ecommerceMall.seller.seller.admin_requests.create(
        sellerConnection,
        {
          body: {
            reason: "Different reason - trying to submit again",
          } satisfies IEcommerceMallSellerAdminRequest.ICreate,
        },
      );
    },
  );
}
