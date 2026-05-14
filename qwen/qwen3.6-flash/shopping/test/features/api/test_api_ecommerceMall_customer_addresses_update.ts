import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_addresses_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShippingAddress =
    await api.functional.ecommerceMall.customer.addresses.update(connection, {
      addressId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallShippingAddress.IUpdate>(),
    });
  typia.assert(output);
}
