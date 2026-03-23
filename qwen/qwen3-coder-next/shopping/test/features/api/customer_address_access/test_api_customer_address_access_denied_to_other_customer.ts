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

export async function test_api_customer_address_access_denied_to_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A account and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    }),
  });
  // 2. Customer A creates an address to get a real addressId
  const addressA = await api.functional.ecommerceMall.customer.addresses.create(
    customerAConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: `${typia.random<number>()} ${RandomGenerator.name()} Street`,
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "Korea",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  // 3. Create Customer B account and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    }),
  });
  // 4. Customer B attempts to access Customer A's address (should get 404)
  try {
    await api.functional.ecommerceMall.customer.addresses.at(
      customerBConnection,
      {
        addressId: addressA.id,
      },
    );
    throw new Error("Expected 404 error but request succeeded");
  } catch (exp) {
    TestValidator.httpError(
      "Customer B accessing Customer A's address returns 404",
      404,
      () => {
        throw exp;
      },
    );
  }
  // 5. Customer B attempts to access non-existent address (should also get 404)
  try {
    await api.functional.ecommerceMall.customer.addresses.at(
      customerBConnection,
      {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
    throw new Error("Expected 404 error but request succeeded");
  } catch (exp) {
    TestValidator.httpError(
      "Customer B accessing non-existent address returns 404",
      404,
      () => {
        throw exp;
      },
    );
  }
  // 6. Test invalid UUID format for addressId
  try {
    await api.functional.ecommerceMall.customer.addresses.at(
      customerBConnection,
      {
        addressId: "invalid-uuid-format",
      },
    );
    throw new Error("Expected validation error for invalid UUID format");
  } catch (exp) {
    TestValidator.httpError(
      "Invalid UUID format returns validation error",
      400,
      () => {
        throw exp;
      },
    );
  }
}