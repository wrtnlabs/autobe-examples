import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IPageIEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerPasswordReset";
import typia from "typia";

export async function test_api_ecommerceMall_customer_password_resets_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallCustomerPasswordReset.ISummary =
    await api.functional.ecommerceMall.customer.password_resets.index(
      connection,
      {
        body: typia.random<IEcommerceMallCustomerPasswordReset.IRequest>(),
      },
    );
  typia.assert(output);
}
