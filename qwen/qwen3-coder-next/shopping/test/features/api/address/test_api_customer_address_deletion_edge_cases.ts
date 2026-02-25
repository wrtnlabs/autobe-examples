import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_address_deletion_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "12341234",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Note: Customer address creation endpoint is not available in the provided API
  // The only available endpoint for addresses is 'erase' (DELETE)
  // So we cannot create test addresses to delete
  // This test scenario requires an address creation endpoint that doesn't exist
  // Since we can't create addresses, we can only test the delete endpoint
  // by providing a non-existent address ID (which should fail with 404)
  await TestValidator.error(
    "delete non-existent address should fail",
    async () => {
      await api.functional.shoppingMall.customer.addresses.erase(
        customerConnection,
        {
          addressId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
