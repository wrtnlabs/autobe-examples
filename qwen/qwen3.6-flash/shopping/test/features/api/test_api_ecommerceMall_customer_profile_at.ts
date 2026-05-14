import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import typia from "typia";

export async function test_api_ecommerceMall_customer_profile_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomer.IProfile =
    await api.functional.ecommerceMall.customer.profile.at(connection);
  typia.assert(output);
}
