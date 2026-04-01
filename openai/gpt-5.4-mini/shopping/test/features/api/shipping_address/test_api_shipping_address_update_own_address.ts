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

export async function test_api_shipping_address_update_own_address(
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
  const updateBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
    isDefault: true,
  } satisfies IMallPlatformShippingAddress.IUpdate;
  const updated =
    await api.functional.mallPlatform.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "shipping address id preserved",
    updated.id,
    shippingAddressId,
  );
  TestValidator.equals(
    "owner id preserved",
    updated.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner email preserved",
    updated.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "recipient name updated",
    updated.recipientName,
    updateBody.recipientName,
  );
  TestValidator.equals(
    "phone number updated",
    updated.phoneNumber,
    updateBody.phoneNumber,
  );
  TestValidator.equals(
    "street address updated",
    updated.streetAddress,
    updateBody.streetAddress,
  );
  TestValidator.equals("city updated", updated.city, updateBody.city);
  TestValidator.equals(
    "state province updated",
    updated.stateProvince,
    updateBody.stateProvince,
  );
  TestValidator.equals(
    "postal code updated",
    updated.postalCode,
    updateBody.postalCode,
  );
  TestValidator.equals("country updated", updated.country, updateBody.country);
  TestValidator.equals("default address updated", updated.isDefault, true);
  TestValidator.predicate(
    "created timestamp exists",
    updated.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    updated.updatedAt.length > 0,
  );
  TestValidator.equals("address remains active", updated.deletedAt, null);
}
