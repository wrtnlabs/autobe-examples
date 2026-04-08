import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_validation_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Submit validation request with complete valid address data
  const body: IEcommerceMallShippingAddress.IRequest = {
    recipientName: "John Doe",
    phone: "1234567890",
    streetAddress: "123 Main Street, Apt 4B",
    city: "Seoul",
    state: "Gangnam-gu",
    postalCode: "12345",
    country: "South Korea",
  };
  const result = await api.functional.ecommerceMall.customer.addresses.validate(
    customerConnection,
    { body },
  );
  typia.assert(result);
  // 3. Validate that all fields passed validation
  TestValidator.equals("isValid should be true", result.isValid, true);
  TestValidator.equals(
    "recipientName isValid",
    result.recipientName?.isValid,
    true,
  );
  TestValidator.equals("phone isValid", result.phone?.isValid, true);
  TestValidator.equals(
    "streetAddress isValid",
    result.streetAddress?.isValid,
    true,
  );
  TestValidator.equals("city isValid", result.city?.isValid, true);
  TestValidator.equals("state isValid", result.state?.isValid, true);
  TestValidator.equals("postalCode isValid", result.postalCode?.isValid, true);
  TestValidator.equals("country isValid", result.country?.isValid, true);
  // 4. Validate no error messages present
  TestValidator.equals(
    "recipientName has no error",
    result.recipientName?.error,
    undefined,
  );
  TestValidator.equals("phone has no error", result.phone?.error, undefined);
  TestValidator.equals(
    "streetAddress has no error",
    result.streetAddress?.error,
    undefined,
  );
  TestValidator.equals("city has no error", result.city?.error, undefined);
  TestValidator.equals("state has no error", result.state?.error, undefined);
  TestValidator.equals(
    "postalCode has no error",
    result.postalCode?.error,
    undefined,
  );
  TestValidator.equals(
    "country has no error",
    result.country?.error,
    undefined,
  );
}
