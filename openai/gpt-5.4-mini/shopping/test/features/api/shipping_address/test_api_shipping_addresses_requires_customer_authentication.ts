import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that the customer shipping address listing endpoint rejects unauthenticated access.
 *
 * This test confirms the address book cannot be accessed without customer authentication and that
 * protected data is not exposed to anonymous requests.
 *
 * 1. Call the shipping-address listing endpoint using the unauthenticated base connection.
 * 2. Assert that the request fails with an authorization error.
 */
export async function test_api_shipping_addresses_requires_customer_authentication(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "customer shipping addresses require authentication",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformShippingAddress.IRequest,
        },
      );
    },
  );
}
