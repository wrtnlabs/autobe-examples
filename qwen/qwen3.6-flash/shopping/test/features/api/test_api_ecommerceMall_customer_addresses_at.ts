import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_addresses_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShippingAddress =
    await api.functional.ecommerceMall.customer.addresses.at(connection, {
      addressId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
