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

export async function test_api_shipping_address_deleted_record_lookup(
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
  await TestValidator.error(
    "deleted or missing shipping address should not be treated as an active selectable destination",
    async () => {
      const response =
        await api.functional.mallPlatform.customer.shipping_addresses.at(
          customerConnection,
          {
            shippingAddressId,
          },
        );
      typia.assert(response);
      TestValidator.equals(
        "shipping address id should match lookup target",
        response.id,
        shippingAddressId,
      );
      TestValidator.equals(
        "shipping address should belong to authenticated customer",
        response.customer.id,
        authorized.id,
      );
      TestValidator.equals(
        "shipping address owner email should match authenticated customer",
        response.customer.email,
        authorized.email,
      );
      TestValidator.predicate(
        "shipping address is removed from active use when deletedAt is present",
        response.deletedAt !== null,
      );
    },
  );
}
