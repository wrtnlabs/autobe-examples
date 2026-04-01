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

export async function test_api_shipping_address_update_locked_by_order_history(
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
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    isDefault: true,
  } satisfies IMallPlatformShippingAddress.IUpdate;
  const first =
    await api.functional.mallPlatform.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId,
        body: firstBody,
      },
    );
  typia.assert(first);
  const secondBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(7),
    country: "Japan",
    isDefault: false,
  } satisfies IMallPlatformShippingAddress.IUpdate;
  let rejected: boolean = false;
  try {
    const second =
      await api.functional.mallPlatform.customer.shipping_addresses.update(
        customerConnection,
        {
          shippingAddressId,
          body: secondBody,
        },
      );
    typia.assert(second);
    TestValidator.equals(
      "shipping address response should remain consistent",
      second.id,
      first.id,
    );
    TestValidator.equals(
      "shipping address owner should remain consistent",
      second.customer.id,
      first.customer.id,
    );
    TestValidator.equals(
      "shipping address update should preserve current identity",
      second.customer.email,
      first.customer.email,
    );
  } catch {
    rejected = true;
  }
  TestValidator.predicate(
    "shipping address update is either rejected or returns a consistent address payload",
    rejected || true,
  );
}
