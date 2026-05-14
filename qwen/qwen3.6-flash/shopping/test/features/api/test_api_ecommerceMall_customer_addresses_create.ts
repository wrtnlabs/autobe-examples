import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import typia from "typia";

export async function test_api_ecommerceMall_customer_addresses_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShippingAddress =
    await api.functional.ecommerceMall.customer.addresses.create(connection, {
      body: typia.random<IEcommerceMallShippingAddress.ICreate>(),
    });
  typia.assert(output);
}
