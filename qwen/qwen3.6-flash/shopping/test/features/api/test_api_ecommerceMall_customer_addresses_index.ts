import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
import typia from "typia";

export async function test_api_ecommerceMall_customer_addresses_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallShippingAddress.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(connection, {
      body: typia.random<IEcommerceMallShippingAddress.IRequest>(),
    });
  typia.assert(output);
}
