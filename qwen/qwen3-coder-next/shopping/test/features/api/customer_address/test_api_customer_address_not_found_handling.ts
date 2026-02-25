import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_address_not_found_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection with valid authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData: IShoppingMallCustomer.IJoin = {
    email: (typia.random<string>() as string) satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email"> as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
    password: "12345678" as string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">,
    href: "https://example.com" as string & tags.Format<"uri">,
    referrer: "https://referrer.com" as string & tags.Format<"uri">,
  };
  await authorize_customer_join(customerConnection, { body: customerData });
  // Generate a random UUID that likely doesn't exist in database
  const nonExistentAddressId = typia.random<string & tags.Format<"uuid">>();
  // Verify that retrieving non-existent address throws error
  await TestValidator.error(
    "should throw error for non-existent address",
    async () => {
      await api.functional.shoppingMall.customer.addresses.at(
        customerConnection,
        {
          addressId: nonExistentAddressId,
        },
      );
    },
  );
}