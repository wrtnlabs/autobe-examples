import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator receives 404 when retrieving a non-existent customer address.
 *
 * Validates information hiding by checking that requesting a random (non-existent) address ID for a valid customer returns 404 without leaking whether the address ever existed.
 *
 * 1. Join as administrator via authorize_administrator_join.
 * 2. Join as customer via authorize_customer_join, capturing the customer's UUID.
 * 3. As administrator, call the get address endpoint with a random UUID as addressId.
 * 4. Verify the response returns 404 Not Found.
 */
export async function test_api_administrator_retrieve_customer_address_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Customer setup — capture the customer UUID
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IECommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  // 3. Generate a random UUID for a non-existent address
  const fakeAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the non-existent address — expect 404
  await TestValidator.httpError(
    "retrieve non-existent address as administrator",
    404,
    () =>
      api.functional.eCommerceMall.administrator.customers.addresses.at(
        adminConnection,
        {
          customerId: customer.id,
          addressId: fakeAddressId,
        },
      ),
  );
}
