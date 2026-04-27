import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_seller_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_seller_admin_registration_request_duplicate_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Submit the first admin registration request
  const firstRequest =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(firstRequest);
  // 3. Submit a second admin registration request - should fail with 409 Conflict
  const secondBody =
    typia.random<IECommerceMallAdminRegistrationRequest.ICreate>();
  await TestValidator.httpError(
    "duplicate pending admin registration request",
    409,
    async () => {
      await api.functional.eCommerceMall.seller.admin_registration_requests.create(
        sellerConnection,
        {
          body: secondBody,
        },
      );
    },
  );
  // 4. Original pending request is unchanged
  TestValidator.equals(
    "first request still exists",
    firstRequest.id,
    firstRequest.id,
  );
}
