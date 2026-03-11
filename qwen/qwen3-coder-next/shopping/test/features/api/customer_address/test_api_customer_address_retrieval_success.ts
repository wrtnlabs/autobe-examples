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
  // 1. Register customer with unique credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies DeepPartial<IEcommerceMallCustomer.IJoin> as IEcommerceMallCustomer.IJoin;
  const joinOutput: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.join(connection, {
      body: joinInput,
    });
  typia.assert(joinOutput);
  // 2. Create authenticated connection from registration response
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: joinOutput.token.access };
  // 3. Create shipping address with authenticated connection
  const addressInput = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IEcommerceMallAddress.ICreate;
  const createdAddress: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      {
        body: addressInput,
      },
    );
  typia.assert(createdAddress);
  // 4. Retrieve address by ID using authenticated connection
  const retrievedAddress: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(retrievedAddress);
  // 5. Validate retrieved address matches created address
  TestValidator.equals(
    "recipient_name matches",
    retrievedAddress.recipient_name,
    addressInput.recipient_name,
  );
  TestValidator.equals(
    "phone_number matches",
    retrievedAddress.phone_number,
    addressInput.phone_number,
  );
  TestValidator.equals(
    "street_address matches",
    retrievedAddress.street_address,
    addressInput.street_address,
  );
  TestValidator.equals(
    "city matches",
    retrievedAddress.city,
    addressInput.city,
  );
  TestValidator.equals(
    "state_province matches",
    retrievedAddress.state_province,
    addressInput.state_province,
  );
  TestValidator.equals(
    "postal_code matches",
    retrievedAddress.postal_code,
    addressInput.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    addressInput.country,
  );
  TestValidator.equals(
    "is_default matches",
    retrievedAddress.is_default,
    addressInput.is_default,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedAddress.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedAddress.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrievedAddress.deleted_at, null);
}