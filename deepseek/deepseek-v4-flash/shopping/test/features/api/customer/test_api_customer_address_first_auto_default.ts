import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_customer_address_first_auto_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as customer and obtain authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first shipping address without is_default
  const input = {
    recipient_name: "John Doe",
    phone_number: "01012345678",
    street_address: "123 Main St",
    city: "Seoul",
    state_province: "Seoul",
    postal_code: "12345",
    country: "South Korea",
  } satisfies IECommerceMallCustomerAddress.ICreate;
  const address: IECommerceMallCustomerAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: input,
      },
    );
  // 3. Full type validation of response
  typia.assert(address);
  // 4. Business logic: first address should auto-default
  TestValidator.equals("first address auto-defaults", address.is_default, true);
  // 5. Validate all input fields match the response
  TestValidator.equals(
    "recipient_name matches",
    address.recipient_name,
    input.recipient_name,
  );
  TestValidator.equals(
    "phone_number matches",
    address.phone_number,
    input.phone_number,
  );
  TestValidator.equals(
    "street_address matches",
    address.street_address,
    input.street_address,
  );
  TestValidator.equals("city matches", address.city, input.city);
  TestValidator.equals(
    "state_province matches",
    address.state_province,
    input.state_province,
  );
  TestValidator.equals(
    "postal_code matches",
    address.postal_code,
    input.postal_code,
  );
  TestValidator.equals("country matches", address.country, input.country);
  // 6. Customer reference must be present (not null/undefined)
  TestValidator.predicate(
    "customer reference present",
    () => address.customer !== null && address.customer !== undefined,
  );
}
