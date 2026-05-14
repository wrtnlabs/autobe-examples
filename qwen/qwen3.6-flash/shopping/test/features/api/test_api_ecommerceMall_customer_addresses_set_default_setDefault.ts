import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_addresses_set_default_setDefault(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShippingAddress =
    await api.functional.ecommerceMall.customer.addresses.set_default.setDefault(
      connection,
      {
        addressId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallShippingAddress.ISetDefault>(),
      },
    );
  typia.assert(output);
}
