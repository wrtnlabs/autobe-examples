import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_update_own_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.name(1),
  } satisfies IMallPlatformShippingAddress.IUpdate;
  const updated =
    await api.functional.mallPlatform.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId,
        body,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "shipping address id should be preserved",
    updated.id,
    shippingAddressId,
  );
  TestValidator.equals(
    "shipping address owner id should be preserved",
    updated.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "recipient name should be updated",
    updated.recipientName,
    body.recipientName,
  );
  TestValidator.equals(
    "phone number should be updated",
    updated.phoneNumber,
    body.phoneNumber,
  );
  TestValidator.equals(
    "street address should be updated",
    updated.streetAddress,
    body.streetAddress,
  );
  TestValidator.equals("city should be updated", updated.city, body.city);
  TestValidator.equals(
    "state or province should be updated",
    updated.stateProvince,
    body.stateProvince,
  );
  TestValidator.equals(
    "postal code should be updated",
    updated.postalCode,
    body.postalCode,
  );
  TestValidator.equals(
    "country should be updated",
    updated.country,
    body.country,
  );
}
