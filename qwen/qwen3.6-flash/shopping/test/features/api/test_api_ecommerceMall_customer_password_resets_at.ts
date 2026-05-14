import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_password_resets_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomerPasswordReset =
    await api.functional.ecommerceMall.customer.password_resets.at(connection, {
      resetId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
