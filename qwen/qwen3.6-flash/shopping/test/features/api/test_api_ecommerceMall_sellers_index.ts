import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import typia from "typia";

export async function test_api_ecommerceMall_sellers_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.sellers.index(connection, {
      body: typia.random<IEcommerceMallSeller.IRequest>(),
    });
  typia.assert(output);
}
