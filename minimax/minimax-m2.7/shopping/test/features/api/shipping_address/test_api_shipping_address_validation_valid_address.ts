import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_validation_valid_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: "Need admin access for testing address validation functionality",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    },
  });
  typia.assert(admin);
  // 2. Create a customer to get valid customerId
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(customer);
  // 3. Prepare a valid address object with all required fields
  const validAddress = {
    recipientName: "John Doe",
    phone: "1234567890",
    streetAddress: "123 Main Street",
    city: "Seoul",
    state: "Gangnam-gu",
    postalCode: "12345",
    country: "South Korea",
  } satisfies IEcommerceMallShippingAddress.IRequest;
  // 4. Call PATCH /ecommerceMall/admin/customers/{customerId}/addresses/validate
  const validationResult =
    await api.functional.ecommerceMall.admin.customers.addresses.validate(
      adminConnection,
      {
        customerId: customer.id,
        body: validAddress,
      },
    );
  typia.assert(validationResult);
  // 5. Validate response returns isValid: true and empty errors array
  TestValidator.equals(
    "validation should be valid",
    validationResult.isValid,
    true,
  );
  TestValidator.equals(
    "errors array should be empty",
    validationResult.errors,
    [],
  );
}
