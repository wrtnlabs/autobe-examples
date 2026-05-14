import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import typia from "typia";

export async function test_api_ecommerceMall_customer_sessions_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(connection, {
      body: typia.random<IEcommerceMallCustomerSession.IRequest>(),
    });
  typia.assert(output);
}
