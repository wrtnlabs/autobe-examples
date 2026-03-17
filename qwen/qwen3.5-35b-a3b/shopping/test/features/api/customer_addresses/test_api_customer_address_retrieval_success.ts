import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_customer_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const registerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(registerConnection, {
      body: typia.random<IEcommerceMallCustomer.IJoin>(),
    });
  typia.assert(customer);
  // 2. Create customer-specific connection for API calls
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customer.token.access };
  // 3. Create a shipping address using utility function
  const address: IEcommerceMallAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: typia.random<IEcommerceMallAddress.ICreate>(),
      },
    );
  typia.assert(address);
  // 4. Capture the addressId from created response
  const addressId: string = address.id;
  // 5. Retrieve the address by ID
  const retrievedAddress: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: addressId,
      },
    );
  typia.assert(retrievedAddress);
  // 6. Validate retrieved address matches created address
  TestValidator.equals("address id matches", retrievedAddress.id, address.id);
  TestValidator.equals(
    "ecommerce_mall_customer_id matches",
    retrievedAddress.ecommerce_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "recipient_name matches",
    retrievedAddress.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "recipient_phone matches",
    retrievedAddress.recipient_phone,
    address.recipient_phone,
  );
  TestValidator.equals(
    "street matches",
    retrievedAddress.street,
    address.street,
  );
  TestValidator.equals("city matches", retrievedAddress.city, address.city);
  TestValidator.equals("state matches", retrievedAddress.state, address.state);
  TestValidator.equals(
    "is_default matches",
    retrievedAddress.is_default,
    address.is_default,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedAddress.created_at,
    address.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedAddress.updated_at,
    address.updated_at,
  );
  // 7. Verify address is not soft-deleted (deleted_at should be null)
  TestValidator.equals(
    "address not soft-deleted",
    retrievedAddress.deleted_at,
    null,
  );
}
