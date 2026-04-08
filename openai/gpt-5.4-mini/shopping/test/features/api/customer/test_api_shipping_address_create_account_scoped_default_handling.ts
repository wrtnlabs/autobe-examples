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

export async function test_api_shipping_address_create_account_scoped_default_handling(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify customer-scoped shipping address creation with default address handling.
   *
   * This scenario validates that a newly created shipping address belongs only to
   * the authenticated customer account, that the returned payload includes the
   * owning customer summary, and that creating a default address produces a
   * separate address record tied to the same signed-in customer.
   *
   * 1. Register and authenticate a customer using an isolated connection.
   * 2. Create an initial saved shipping address marked as non-default.
   * 3. Create a second shipping address marked as default.
   * 4. Validate ownership, default flag behavior, and record separation.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "Korea",
          is_default: false,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  const created =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "Korea",
          is_default: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created address owner id",
    created.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "created address owner email",
    created.customer.email,
    authorized.email,
  );
  TestValidator.equals("created address is default", created.isDefault, true);
  TestValidator.equals(
    "first address owner id",
    firstAddress.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "first address remains non-default",
    firstAddress.isDefault,
    false,
  );
  TestValidator.notEquals(
    "addresses must be distinct records",
    created.id,
    firstAddress.id,
  );
  TestValidator.predicate(
    "both addresses belong to the same authenticated customer",
    created.customer.id === firstAddress.customer.id,
  );
}
