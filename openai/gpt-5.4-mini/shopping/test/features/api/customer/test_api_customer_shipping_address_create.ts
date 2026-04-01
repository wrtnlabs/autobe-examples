import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_shipping_addresses_create } from "../../../generate/generate_random_mall_platform_customer_shipping_addresses_create";
import { prepare_random_mall_platform_shipping_address } from "../../../prepare/prepare_random_mall_platform_shipping_address";

export async function test_api_customer_shipping_address_create(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const body = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
  } satisfies IMallPlatformShippingAddress.ICreate;
  const address =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body,
      },
    );
  typia.assert(address);
  TestValidator.equals(
    "recipient name",
    address.recipientName,
    body.recipientName,
  );
  TestValidator.equals("phone number", address.phoneNumber, body.phoneNumber);
  TestValidator.equals(
    "street address",
    address.streetAddress,
    body.streetAddress,
  );
  TestValidator.equals("city", address.city, body.city);
  TestValidator.equals(
    "state/province",
    address.stateProvince,
    body.stateProvince,
  );
  TestValidator.equals("postal code", address.postalCode, body.postalCode);
  TestValidator.equals("country", address.country, body.country);
  TestValidator.predicate("has address id", address.id.length > 0);
  TestValidator.equals("owned by customer", address.customer.id, authorized.id);
  TestValidator.equals(
    "customer email matches",
    address.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer status matches",
    address.customer.status,
    authorized.status,
  );
  TestValidator.equals(
    "customer deletedAt matches",
    address.customer.deleted_at,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "default flag is exposed",
    typeof address.isDefault,
    "boolean",
  );
  TestValidator.predicate(
    "saved address is active",
    address.deletedAt === null,
  );
}
