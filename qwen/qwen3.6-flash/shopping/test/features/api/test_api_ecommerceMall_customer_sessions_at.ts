import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_sessions_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomerSession =
    await api.functional.ecommerceMall.customer.sessions.at(connection, {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
