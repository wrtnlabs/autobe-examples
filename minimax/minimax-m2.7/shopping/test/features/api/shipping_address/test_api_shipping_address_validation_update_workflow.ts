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

export async function test_api_shipping_address_validation_update_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Submit validation request for updated address data
  const validationResult =
    await api.functional.ecommerceMall.customer.addresses.validate(
      customerConnection,
      {
        body: {
          recipientName: "Robert Kim",
          phone: "1112223333",
          streetAddress: "789 New Tower Building, Suite 500",
          city: "Incheon",
          state: "Jung-gu",
          postalCode: "67890",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(validationResult);
  // 3. Validate that all fields are valid
  TestValidator.equals("overall isValid", validationResult.isValid, true);
  TestValidator.equals(
    "recipientName isValid",
    validationResult.recipientName?.isValid,
    true,
  );
  TestValidator.equals("phone isValid", validationResult.phone?.isValid, true);
  TestValidator.equals(
    "streetAddress isValid",
    validationResult.streetAddress?.isValid,
    true,
  );
  TestValidator.equals("city isValid", validationResult.city?.isValid, true);
  TestValidator.equals("state isValid", validationResult.state?.isValid, true);
  TestValidator.equals(
    "postalCode isValid",
    validationResult.postalCode?.isValid,
    true,
  );
  TestValidator.equals(
    "country isValid",
    validationResult.country?.isValid,
    true,
  );
  // 4. Validate no error messages are present
  TestValidator.equals(
    "recipientName error",
    validationResult.recipientName?.error,
    undefined,
  );
  TestValidator.equals("phone error", validationResult.phone?.error, undefined);
  TestValidator.equals(
    "streetAddress error",
    validationResult.streetAddress?.error,
    undefined,
  );
  TestValidator.equals("city error", validationResult.city?.error, undefined);
  TestValidator.equals("state error", validationResult.state?.error, undefined);
  TestValidator.equals(
    "postalCode error",
    validationResult.postalCode?.error,
    undefined,
  );
  TestValidator.equals(
    "country error",
    validationResult.country?.error,
    undefined,
  );
}
