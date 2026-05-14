import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import typia from "typia";

export async function test_api_ecommerceMall_customer_profile_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomerProfile =
    await api.functional.ecommerceMall.customer.profile.update(connection, {
      body: typia.random<IEcommerceMallCustomerProfile.IUpdate>(),
    });
  typia.assert(output);
}
